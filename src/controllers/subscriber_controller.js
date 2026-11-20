const Subscriber = require('../models/Subscriber');
const {isValidInquiryEmail} = require('../util/emailValidator');
const crypto = require('crypto');

const createSubscriber = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailCheck = await isValidInquiryEmail(email);
    if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.reason });

    const existing = await Subscriber.findOne({ email });
    if (existing && existing.isSubscribed) {
      return res.status(409).json({ message: 'Already subscribed' });
    }

    if (existing) {
      existing.isSubscribed = true;
      existing.unsubscribedAt = null;
      existing.subscribedAt = new Date();
      await existing.save();
      return res.status(200).json({ message: 'Welcome back! You are subscribed again', subscriber: existing });
    }

    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    const subscriber = await Subscriber.create({ email, unsubscribeToken });
    res.status(201).json({ message: 'Thank you for subscribing', subscriber });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already subscribed' });
    res.status(400).json({ error: err.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const subscriber = await Subscriber.findOneAndUpdate(
      { unsubscribeToken: req.params.token },
      { isSubscribed: false, unsubscribedAt: new Date() },
      { new: true }
    );
    if (!subscriber) return res.status(404).json({ message: 'Subscriber not found' });
    res.status(200).json({ message: 'Unsubscribed', subscriber });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getSubscribers = async (req, res) => {
  try {
    // default sorting is most recently subscribed
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });
    res.status(200).json(subscribers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
};

module.exports = {
  createSubscriber,
  unsubscribe,
  getSubscribers
};
