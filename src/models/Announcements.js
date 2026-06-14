const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {type: String, required: true},
  author: {type: String},
  date: {type: Date, default: Date.now},
  image: {type: String},
  content: {type: String, required: true},
  isPublished: {type: Boolean, required: true, default: false},
  isBlasted: {type: Boolean, required: true, default: false}
});

module.exports = mongoose.model('Announcements', announcementSchema);
