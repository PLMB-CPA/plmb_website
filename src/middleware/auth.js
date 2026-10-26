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

module.exports = {requireAuth, requireAdminPage, requireClient, requireClientLogin};
