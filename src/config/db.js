//
//  db.js
//  PLMB_Website
//
//  Created by Justine Aniko Major on 4/8/26.
//

require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
