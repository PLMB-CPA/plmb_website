const Subscriber = require('../models/Subscriber');
const {isValidInquiryEmail} = require('../util/emailValidator');
const Client = require('../models/Client');
const crypto = require('crypto');
const { sendSubscriptionWelcome } = require('../util/emailer');

async function sendWelcome(subscriber) {
  try {
    await sendSubscriptionWelcome(subscriber.email, subscriber.unsubscribeToken);
  } catch (err) {
    console.error('Subscription welcome email failed');
  }
}

const createSubscriber = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailCheck = await isValidInquiryEmail(email);
    if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.reason });

    const existing = await Subscriber.findOne({ email });
    if (existing && existing.isSubscribed) {
      return res.status(200).json({ message: 'Thank you for subscribing' });
    }

    if (existing) {
      existing.isSubscribed = true;
      existing.unsubscribedAt = null;
      existing.subscribedAt = new Date();
      await existing.save();
      await sendWelcome(existing);
      return res.status(200).json({ message: 'Thank you for subscribing' });
    }

    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    const subscriber = await Subscriber.create({ email, unsubscribeToken });
    await sendWelcome(subscriber);
    res.status(201).json({ message: 'Thank you for subscribing' });
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ message: 'Thank you for subscribing' });
    res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const token = req.body && req.body.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    const subscriber = await Subscriber.findOneAndUpdate(
      { unsubscribeToken: token },
      { isSubscribed: false, unsubscribedAt: new Date() },
      { new: true }
    );
    if (!subscriber) return res.status(404).json({ message: 'Subscriber not found' });
    res.status(200).json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe. Please try again.' });
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

const getClientSubscription = async (req, res) => {
  try {
    const client = await Client.findById(req.session.clientId).select('email');
    if (!client) return res.status(404).json({ error: 'User not found.' });

    const subscriber = await Subscriber.findOne({ email: client.email.trim().toLowerCase() });
    res.status(200).json({ email: client.email, isSubscribed: !!(subscriber && subscriber.isSubscribed) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load subscription.' });
  }
};

const updateClientSubscription = async (req, res) => {
  try {
    if (typeof req.body.subscribed !== 'boolean') {
      return res.status(400).json({ error: 'subscribed must be true or false.' });
    }

    const client = await Client.findById(req.session.clientId).select('email');
    if (!client) return res.status(404).json({ error: 'User not found.' });

    const email = client.email.trim().toLowerCase();
    let subscriber = await Subscriber.findOne({ email });

    if (req.body.subscribed) {
      if (!subscriber) {
        subscriber = await Subscriber.create({ email, unsubscribeToken: crypto.randomBytes(32).toString('hex') });
        await sendWelcome(subscriber);
      } else if (!subscriber.isSubscribed) {
        subscriber.isSubscribed = true;
        subscriber.unsubscribedAt = null;
        subscriber.subscribedAt = new Date();
        await subscriber.save();
        await sendWelcome(subscriber);
      }
    } else if (subscriber && subscriber.isSubscribed) {
      subscriber.isSubscribed = false;
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();
    }

    res.status(200).json({ email, isSubscribed: !!(subscriber && subscriber.isSubscribed) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Please try again.' });
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
};

module.exports = {
  getClientSubscription,
  updateClientSubscription,
  createSubscriber,
  unsubscribe,
  getSubscribers
};
