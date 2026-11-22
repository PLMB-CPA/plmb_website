const Admin = require('../models/Admin');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

function requireAdminPage(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin/login');
  }
  next();
}

async function requireMainAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    const admin = await Admin.findById(req.session.adminId).select('isMain');
    if (!admin || !admin.isMain) {
      return res.status(403).json({ error: 'Only the main administrator can manage admins.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'An error has occurred' });
  }
}

function requireClient(req, res, next) {
  if (!req.session || !req.session.isClient) {
    return res.status(401).json({error: 'Unauthorized.'});
  }
  if (req.session.mustChangePassword) {
    return res.status(403).json({error: 'Password change required.', mustChangePassword: true});
  }
  next();
}

function requireClientLogin(req, res, next) {
  if (!req.session || !req.session.isClient) {
    return res.status(401).json({error: 'Unauthorized.'})
  }
  next();
}

module.exports = {requireAuth, requireMainAdmin, requireAdminPage, requireClient, requireClientLogin};
