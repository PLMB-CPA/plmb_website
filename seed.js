const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const Admin = require('./src/models/Admin');

async function seed() {
  await connectDB();

  const username = 'plmbadmin';          
  const password = 'plmb2026.'; 

  const hashed = await bcrypt.hash(password, 10);
  const existing = await Admin.findOne({ username });

  if (existing) {
    console.log('Admin already exists.');
  } else {
    await Admin.create({ username, password: hashed });
    console.log(`Created admin "${username}" / "${password}"`);
  }

  mongoose.connection.close();
}

seed();