const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  title: {type: String, required: true},
  author: {type: String},
  date: {type: Date, default: Date.now},
  image: {type: String},
  content: {type: String, required: true},
  isPublished: {type: Boolean, required: true, default: false},
  isBlasted: {type: Boolean, required: true, default: false}
});

module.exports = mongoose.model('Newsletter', newsletterSchema);
