const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

exports.postAdminLogin =async (req, res) => {
  try {
    const admin = await Admin.findOne({username: req.body.username});
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
