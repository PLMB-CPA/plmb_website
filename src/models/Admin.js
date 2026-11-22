const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  name: {type: String, trim: true, default: ''},
  email: {type: String, trim: true, lowercase: true, default: ''},
  isMain: {type: Boolean, default: false},
  openLastPage: {type: Boolean, default: false}
});

module.exports = mongoose.model('Admin', adminSchema);