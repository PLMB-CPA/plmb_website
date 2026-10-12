const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

exports.postAdminLogin =async (req, res) => {
  try {
    const admin = await Admin.findOne({username: req.body.username.toLowerCase().trim()});
    if (!admin) return res.status(401).json({error: 'Invalid username'});

    const isMatch = await bcrypt.compare(req.body.password, admin.password);
    if (!isMatch) return res.status(401).json({error: 'Invalid password'});

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

function checkPasswordStrength(password) {
  const specialChars = /[!@#$%^&*(),.?":{}|<>_-]/;
  const capitalChars = /[A-Z]/;

  if (password.length < 8)
    return 'Password must be at least 8 characters long';

  if (!specialChars.test(password))
    return 'Password must have at least one (1) special character';

  if (!capitalChars.test(password))
    return 'Password must have at least one (1) capitalized letter';

  return null; 
}

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

exports.getAdminUsername = async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId).select('username');
    
    if (!admin)
      return res.status(404).json({error: 'Admin not found, cant retrieve username'});
    
    res.status(200).json({username: admin.username});
  } 
  catch (err) {
    res.status(500).json({error: 'An error has occurred'});
  }
}