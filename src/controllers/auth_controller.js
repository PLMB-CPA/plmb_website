const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

exports.postAdminLogin =async (req, res) => {
  try {
    const admin = await Admin.findOne({username: req.body.username.toLowerCase().trim()});
    if (!admin) return res.redirect('/admin_login.html?error=Invalid username');

    const isMatch = await bcrypt.compare(req.body.password, admin.password);
    if (!isMatch) return res.redirect('/admin_login.html?error=Invalid password');

    req.session.isAdmin = true;
    req.session.adminId = admin._id;

    if (req.body.remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    res.redirect('/admin_dashboard.html');
  } catch (err) {
    res.redirect('/admin_login.html?error=An error occurred.');
  }
};

exports.getAdminLogout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin_login.html');
    });
};

exports.addAdmin = async (req, res) => {
  try {
    const specialChars = /[!@#$%^&*(),.?":{}|<>_-]/;
    const capitalChars = /[A-Z]/;
    const {username, password} = req.body;
	
	// basic password & user verification stuff
    if (!username || !password)
      return res.status(400).json({error: 'Username and/or password is required'});

    if (password.length < 8 || username.length < 8)
      return res.status(400).json({error: 'Username and/or password must be at least 8 characters long'});

    if (username.length > 24)
      return res.status(400).json({error: 'Username length must be no longer than 24 characters'});

    if (!specialChars.test(password)){
      return res.status(400).json({error: 'Password must have at least one (1) special character'});
    }

    if (!capitalChars.test(password)){
      return res.status(400).json({error: 'Password must have at least one (1) capitalized letter'})
    }
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