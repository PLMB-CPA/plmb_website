const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true, lowercase: true, trim: true},
  subscribedAt: {type: Date, default: Date.now},
  unsubscribeToken: {type: String, required: true,  unique: true},
  isSubscribed: {type: Boolean, default: true},
  unsubscribedAt: {type: Date, default: null}
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
