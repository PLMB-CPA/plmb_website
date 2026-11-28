const { sendError } = require('../util/apiError');
const Inquiry = require('../models/Inquiry');
const Client = require('../models/Client');
const {sendInquiryNotification, sendConfirmation, sendReplyEmail} = require('../util/emailer');
const {isValidInquiryEmail} = require('../util/emailValidator');
const {verifyTurnstile} = require('../util/turnstile');
const mongoose = require('mongoose');
const {inquiryStatus, responseTimeMinutes, isOverdue, serializeInquiry} = require('../util/inquiryMetrics');

// helper function for replyToInquiry
// Turns a Nodemailer error into a short reason an admin can understand.
function describeEmailFailure(error) {
  switch (error && error.code) {
    case 'EAUTH':
      return 'the email service could not sign in';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET':
    case 'EDNS':
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ECONNRESET':
      return 'the mail server could not be reached';
    case 'EENVELOPE':
      return 'the email address was rejected';
    default:
      return 'of an unexpected email error'; // fallback for any code not listed above
  }
}

exports.createInquiry = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      businessName,
      email,
      number,
      industrySector,
      category,
      subject,
      message,
      website,
      turnstileToken,
    } = req.body || {};

    if (website) {
      return res.status(201).json({message: 'Your inquiry has been recorded.'});
    }

    if (!(await verifyTurnstile(turnstileToken, req.ip))) {
      return res.status(400).json({error: 'Verification failed. Please try again.'});
    }

    const emailCheck = await isValidInquiryEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({error: emailCheck.reason});
    }

    const existingTickets = await Inquiry.find({}, 'ticketNumber').lean();
    const maxTicketNum = existingTickets.reduce((max, doc) => {
      const match = /^INQ-(\d+)$/.exec(doc.ticketNumber || '');
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const ticketNumber = `INQ-${String(maxTicketNum + 1).padStart(4, '0')}`;

    const inquiry = await Inquiry.create({
      firstName,
      lastName,
      businessName,
      email,
      ...(number !== undefined ? { number } : {}),
      industrySector,
      category,
      subject,
      message,
      ticketNumber,
    });

    sendInquiryNotification(inquiry)
      .then(() => console.log('Notification sent'))
      .catch(err => console.error('Inquiry saved, email failed', err));

    try {
      await sendConfirmation(inquiry);
      console.log('Confirmation sent');
    } catch (err) {
      console.error('Inquiry saved, confirmation email failed', err);
      return res.status(201).json({
        message: 'Your inquiry has been recorded, but the confirmation email failed to send.',
        confirmationEmailSent: false,
        inquiry,
      });
    }

    res.status(201).json({
      message: 'Your inquiry has been recorded.',
      confirmationEmailSent: true,
      inquiry,
    });
  } catch (err) {
    sendError(res, err);
  }
}

exports.getInquiries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
    if (req.query.isAnswered !== undefined) filter.isAnswered = req.query.isAnswered === 'true';
    const inquiries = await Inquiry.find(filter).sort({date: 1});
   res.status(200).json({message: 'Inquiries found', inquiries: inquiries.map(serializeInquiry)});
  } catch (err) {
    sendError(res, err);
  }
};

exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});
    res.status(200).json({message: 'Inquiry found', inquiry: serializeInquiry(inquiry)});
  } catch (err) {
    sendError(res, err);
  }
};

exports.updateInquiry = async (req, res) => {
  try {
    const allowedUpdates = {};
    for (const key of ['isRead', 'isAnswered', 'isArchived']) {
      if (req.body && req.body[key] !== undefined) {
        allowedUpdates[key] = req.body[key];
      }
    }
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, allowedUpdates, {new: true});
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});
    res.status(200).json({message: 'Inquiry updated', inquiry});
  } catch (err) {
    sendError(res, err);
  }
};

exports.replyToInquiry = async (req, res) => {
  const reply = req.body?.reply;

 
  if (typeof reply !== 'string' || !reply.trim()) {
    return res.status(400).json({
      error: 'Please enter a reply before sending.'
    });
  }

  if (reply.trim().length > 10000) {
    return res.status(400).json({
      error: 'Reply must be 10,000 characters or fewer.'
    });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid inquiry ID.'
    });
  }

  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        error: 'Inquiry not found.'
      });
    }

    if (inquiry.repliedAt) {
      return res.status(409).json({
        error: 'This inquiry already has a sent reply.'
      });
    }
    
    const trimmedReply = reply.trim();
    const repliedAt = new Date();

    inquiry.reply = trimmedReply;
    inquiry.repliedAt = repliedAt;
    inquiry.responseTimeMinutes = Math.max(
      0,
      Math.round(
        (repliedAt - inquiry.date) / 60000
      )
    );
    inquiry.isAnswered = true;
    inquiry.status = 'answered';

    await inquiry.save();

    let emailNotificationFailed = false;
    let emailFailureReason = null;
    try {
        await sendReplyEmail(inquiry, trimmedReply);
    } catch (emailError) {
      console.error('Reply email failed: ', emailError);
      emailFailureReason = describeEmailFailure(emailError);
      emailNotificationFailed = true; // record the failure
      inquiry.emailNotificationFailed = true;
      await inquiry.save();
    }

    return res.status(200).json({
      message: emailNotificationFailed
        ? `Reply saved, but the email could not be sent because ${emailFailureReason}.`
        : 'Reply sent successfully.',
      emailNotificationFailed,
      inquiry: serializeInquiry(inquiry)
    });

  } catch (error) {
    console.error('Reply error:', error);

    return res.status(500).json({
      error: 'Unable to send reply. Please try again.'
    });
  }
};

exports.deleteInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});
    res.status(200).json({message: 'Inquiry deleted', inquiry});
  } catch (err) {
    sendError(res, err);
  }
};

exports.getInquiryStats = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({});

    const active = inquiries.filter(
      inquiry => !inquiry.isArchived
    );

    const responseTimes = inquiries
      .map(responseTimeMinutes)
      .filter(time => time !== null);

    const totalResponseTime = responseTimes.reduce(
      (sum, time) => sum + time,
      0
    );

    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(
            totalResponseTime / responseTimes.length
          )
        : null;

    const stats = {
      total: inquiries.length,

      new: active.filter(
        inquiry => inquiryStatus(inquiry) === 'new'
      ).length,

      inProgress: active.filter(
        inquiry => inquiryStatus(inquiry) === 'in_progress'
      ).length,

      answered: active.filter(
        inquiry => inquiryStatus(inquiry) === 'answered'
      ).length,

      archived: inquiries.filter(
        inquiry => inquiry.isArchived
      ).length,

      overdue: active.filter(
        inquiry => isOverdue(inquiry)
      ).length,

      replied: inquiries.filter(
        inquiry => Boolean(inquiry.repliedAt)
      ).length,

      averageResponseTimeMinutes: averageResponseTime
    };

    return res.status(200).json({ stats });

  } catch (error) {
    console.error('Inquiry statistics error:', error);

    return res.status(500).json({
      error: 'Unable to retrieve inquiry statistics.'
    });
  }
};

exports.getClientInquiries = async (req, res) => {
  try {
    // identify the client from the session to prevent IDOR
    const client = await Client.findById(req.session.clientId).select('email');
    if (!client) {
      return res.status(401).json({error: 'Unauthorized.'});
    }

    // Inquiries store only an email, not a client id, so match on email.
    // collation makes the email comparison case-insentive
    const inquiries = await Inquiry.find({email: client.email})
      .collation({locale: 'en', strength: 2})
      .select('ticketNumber subject message date reply repliedAt isAnswered')
      .sort({date: -1}) // newest first
      .lean(); // plain objects, faster and enough for read-only data

    return res.status(200).json({inquiries});
  } catch (error) {
    console.error('Client inquiries error:', error);
    return res.status(500).json({error: 'Failed to load your inquiries.'});
  }
};