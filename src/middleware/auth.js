const jwt = require('jsonwebtoken');

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

module.exports = {requireAuth, requireAdminPage};
