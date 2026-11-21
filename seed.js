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
    if (!existing.isMain) {
      existing.isMain = true;
      await existing.save();
      console.log(`Marked "${username}" as the main admin.`);
    } else {
      console.log('Admin already exists.');
    }
  } else {
    await Admin.create({ username, password: hashed, isMain: true });
    console.log(`Created admin "${username}" / "${password}"`);
  }

  mongoose.connection.close();
}

seed();