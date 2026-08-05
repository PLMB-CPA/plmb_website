const Inquiry = require('../models/Inquiry');
const {sendInquiryNotification, sendConfirmation, sendReplyEmail} = require('../util/emailer');


exports.createInquiry = async (req, res) => {
  try {
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
    res.status(200).json({message: 'Inquiries found', inquiries});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
};

exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});
    res.status(200).json({message: 'Inquiry found', inquiry});
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
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({error: 'Inquiry not found'});

    await sendReplyEmail(inquiry, req.body.reply);

    const updated = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { reply: req.body.reply, repliedAt: new Date(), isAnswered: true },
      { new: true }
    );

    res.status(200).json({message: 'Reply sent', inquiry: updated});
  } catch (err) {
    res.status(400).json({error: err.message});
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