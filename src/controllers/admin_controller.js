const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const { checkPasswordStrength } = require('../util/passwordStrength');

exports.postAdminLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) return res.status(401).json({ error: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.isAdmin = true;
    req.session.adminId = admin._id;
    req.session.username = admin.username;

    if (req.body.remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    res.json({redirect: '/admin'});
  } catch (err) {
    res.status(500).json({error: 'An error occurred.'});
  }
};

exports.getAdminLogout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};

exports.addAdmin = async (req, res) => {
  try {
    const {username, password} = req.body;
      
  // basic password & user verification stuff
    if (!username || !password)
      return res.status(400).json({error: 'Username and/or password is required'});

    if (username.length < 8)
      return res.status(400).json({error: 'Username must be at least 8 characters long'});

    if (username.length > 24)
      return res.status(400).json({error: 'Username length must be no longer than 24 characters'});

    const passwordError = checkPasswordStrength(password);
    
    if (passwordError)
      return res.status(400).json({error: passwordError});

    const ifExists = await Admin.findOne({username: username.toLowerCase().trim()});
    if (ifExists)
      return res.status((409)).json({error: "Already exists"})
      
  // if it passes then encrypt pw and create + add to db
    const bcrypt_password = await bcrypt.hash(password, 10)
    const adminNew = await Admin.create({
      username: username.toLowerCase().trim(), // normalize, remove whitespaces
      password: bcrypt_password
    });

    res.status(201).json({ 
      message: 'Created new admin',
      admin: {
        id: adminNew._id,
        username: adminNew.username
      }
    });
  }
  catch (err) {
    res.status(500).json({error: 'An error has occured, please try again'})
  }
}

exports.getAdmins = async (req, res) => {
  try {
    const adminList = await Admin.find({}).select('-password');
    res.status(200).json(adminList);
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred, please try again'});
  }
}

exports.deleteAdmin = async (req, res) => {
  try {
    if (req.params.id === req.session.adminId.toString())
      return res.status(400).json({error: 'You cannot delete your own account while logged in'});

    const curAdmin = await Admin.findById(req.params.id);
    
    if (!curAdmin) 
      return res.status(404).json({error: 'Admin not found'});

    if (curAdmin.isMain)
      return res.status(400).json({error: 'Remove main admin status before deleting this account'});

    if (await Admin.countDocuments() < 2)
      return res.status(400).json({error: 'At least one admin account must exist at all times'});

    await Admin.findByIdAndDelete(req.params.id);
    res.status(200).json({message: 'Deleted selected admin account'});
  } 
  catch (err) {
    res.status(500).json({error: 'An error has occurred, please try again'});
  }
}

exports.changeAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) 
      return res.status(400).json({error: 'Password field cannot be empty'});

    const passwordError = checkPasswordStrength(password);
    if (passwordError) 
      return res.status(400).json({error: passwordError});

    const bcrypt_password = await bcrypt.hash(password, 10);
    const admin = await Admin.findByIdAndUpdate(req.params.id, {password: bcrypt_password});
    
    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    res.status(200).json({message: 'Password updated'});
  } catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}

exports.setMainAdmin = async (req, res) => {
  try {
    const { isMain } = req.body || {};
    if (typeof isMain !== 'boolean')
      return res.status(400).json({error: 'isMain must be true or false'});

    if (req.params.id === req.session.adminId.toString())
      return res.status(400).json({error: 'You cannot change your own main admin status'});

    const admin = await Admin.findByIdAndUpdate(req.params.id, {isMain}, {new: true}).select('-password');
    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    res.status(200).json({
      message: isMain ? 'Admin is now a main admin' : 'Main admin status removed',
      admin
    });
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminProfile(admin) {
  return {
    id: admin._id,
    username: admin.username,
    name: admin.name || '',
    email: admin.email || '',
    isMain: !!admin.isMain,
    openLastPage: !!admin.openLastPage
  };
}

exports.getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId).select('-password');
    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    res.status(200).json(adminProfile(admin));
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}

exports.updateCurrentAdmin = async (req, res) => {
  try {
    const { username, name = '', email = '' } = req.body || {};

    if (typeof username !== 'string' || typeof name !== 'string' || typeof email !== 'string')
      return res.status(400).json({error: 'Invalid input'});

    const cleanUsername = username.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    if (cleanUsername.length < 8)
      return res.status(400).json({error: 'Username must be at least 8 characters long'});

    if (cleanUsername.length > 24)
      return res.status(400).json({error: 'Username length must be no longer than 24 characters'});

    if (cleanName.length > 60)
      return res.status(400).json({error: 'Name must be no longer than 60 characters'});

    if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail))
      return res.status(400).json({error: 'Please enter a valid email address'});

    const taken = await Admin.findOne({username: cleanUsername, _id: {$ne: req.session.adminId}});
    if (taken)
      return res.status(409).json({error: 'Username is already taken'});

    const admin = await Admin.findByIdAndUpdate(
      req.session.adminId,
      {username: cleanUsername, name: cleanName, email: cleanEmail},
      {new: true}
    ).select('-password');

    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    req.session.username = admin.username;
    res.status(200).json({message: 'Profile updated', admin: adminProfile(admin)});
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}

exports.updatePreferences = async (req, res) => {
  try {
    const { openLastPage } = req.body || {};
    if (typeof openLastPage !== 'boolean')
      return res.status(400).json({error: 'openLastPage must be true or false'});

    const admin = await Admin.findByIdAndUpdate(req.session.adminId, {openLastPage}, {new: true}).select('-password');
    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    res.status(200).json({message: 'Preferences updated', admin: adminProfile(admin)});
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}

exports.changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword)
      return res.status(400).json({error: 'Current and new password are required'});

    const admin = await Admin.findById(req.session.adminId);
    if (!admin)
      return res.status(404).json({error: 'Admin not found'});

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch)
      return res.status(400).json({error: 'Current password is incorrect'});

    if (currentPassword === newPassword)
      return res.status(400).json({error: 'New password must be different from the current password'});

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError)
      return res.status(400).json({error: passwordError});

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.status(200).json({message: 'Password updated'});
  }
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}
