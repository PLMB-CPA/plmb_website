const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  name: {type: String, trim: true, default: ''},
  email: {type: String, trim: true, lowercase: true, default: ''},
  isMain: {type: Boolean, default: false},
  openLastPage: {type: Boolean, default: false},
  resetTokenHash: {type: String, default: null,select: false},
  resetTokenExpiresAt: {type: Date, default: null, select: false},
  resetRequestedAt: {type: Date, default: null, select: false}
});

adminSchema.index(
  {email: 1},
  {unique: true,partialFilterExpression: {email: {$gt: ''}}
});

module.exports = mongoose.model('Admin', adminSchema);