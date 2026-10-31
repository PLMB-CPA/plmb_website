const Inquiry = require('../models/Inquiry');
const {sendInquiryNotification, sendConfirmation, sendReplyEmail} = require('../util/emailer');
const {isValidInquiryEmail} = require('../util/emailValidator');
const mongoose = require('mongoose');
const {inquiryStatus, responseTimeMinutes, isOverdue, serializeInquiry} = require('../util/inquiryMetrics');

exports.createInquiry = async (req, res) => {
  try {
    const emailCheck = await isValidInquiryEmail(req.body.email);
    if (!emailCheck.valid) {
      return res.status(400).json({error: emailCheck.reason});
    }

    const count = await Inquiry.countDocuments();
    const ticketNumber = `INQ-${String(count + 1).padStart(4, '0')}`;
    const inquiry = await Inquiry.create({...req.body, ticketNumber});

    sendInquiryNotification(inquiry)
      .then(() => console.log('Notification sent'))
      .catch(err => console.error('Inquiry saved, email failed', err));
    
    sendConfirmation(inquiry)
        .then(() => console.log('Confirmation sent'))
        .catch(err => console.error('Inquiry saved, confirmation email failed', err));
    
    res.status(201).json({message: 'Your inquiry has been recorded.', inquiry});
  } catch (err) {
    res.status(400).json({error: err.message});
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
    res.status(400).json({error: err.message});
  }
};

exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});
    res.status(200).json({message: 'Inquiry found', inquiry: serializeInquiry(inquiry)});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
};

exports.updateInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({message: 'Inquiry updated', inquiry});
  } catch (err) {
    res.status(400).json({error: err.message});
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
    await sendReplyEmail(inquiry, reply.trim());

    const repliedAt = new Date();

    inquiry.reply = reply.trim();
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

    return res.status(200).json({
      message: 'Reply sent successfully.',
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
    res.status(400).json({error: err.message});
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