require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const routes = require('./routes/index');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Render (and most hosts) sit behind a proxy. Without this, Express thinks the
// request came in over plain HTTP and refuses to send the `secure` cookie.
if (isProduction) {
  app.set('trust proxy', 1);
}


// ===== CORS / ORIGIN CHECK =====
// The React app is served by this same Express server, so the site never needs
// other websites to call /api. Extra origins can be allowed with CORS_ORIGINS
// (comma-separated, e.g. "https://plmb.com.ph,https://www.plmb.com.ph").
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function isAllowedOrigin(req, origin) {
  if (!origin) return true; // same-origin GETs, curl, server-to-server
  if (allowedOrigins.includes(origin)) return true;
  try {
    // Same site: the Origin's host matches the host this request was sent to
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}

// Reject /api requests sent from other websites before they reach any route.
// (CORS alone only stops the other site from *reading* the response; the
// request would still run, so a cross-site POST/DELETE could still do damage.)
app.use('/api', (req, res, next) => {
  if (isAllowedOrigin(req, req.get('origin'))) return next();
  return res.status(403).json({ error: 'Origin not allowed.' });
});

app.use(cors((req, callback) => {
  callback(null, {
    origin: isAllowedOrigin(req, req.get('origin')),
    credentials: true,
  });
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'plmb.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,       // page scripts can't read the cookie (blocks XSS cookie theft)
    secure: isProduction, // HTTPS only on the live site; plain HTTP is fine on localhost
    sameSite: 'lax',      // not sent on cross-site POSTs (CSRF protection)
    // no maxAge: ends when the browser closes, unless "Remember Me" sets 30 days
  },
}));


// ===== API =====
app.use('/api', routes);

// Unknown /api paths get a JSON 404 instead of falling through to the React page
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});


// ===== OLD .html URLS =====
// The site used to be separate .html pages. Send old bookmarks/links to the
// matching React page. (?id=... carries over where the old page used it.)
const LEGACY_PAGES = {
  '/index.html': () => '/',
  '/services.html': () => '/services',
  '/about_us.html': () => '/about',
  '/newsletter-page.html': () => '/newsletter',
  '/newsletter.html': (id) => (id ? `/newsletter/${id}` : '/newsletter'),
  '/inquiry-page.html': () => '/contact',
  '/admin_login.html': () => '/admin/login',
  '/admin_dashboard.html': () => '/admin',
  '/admin_newsletter.html': () => '/admin/newsletters',
  '/post-newsletter.html': (id) => (id ? `/admin/newsletters/${id}/edit` : '/admin/newsletters/new'),
  '/admin_inquiry_management.html': () => '/admin/inquiries',
  '/inquiry-full.html': (id) => (id ? `/admin/inquiries/${id}` : '/admin/inquiries'),
  '/admin_management.html': () => '/admin/manage',
  '/admin_creation.html': () => '/admin/manage',
};

app.get(Object.keys(LEGACY_PAGES), (req, res) => {
  const id = typeof req.query.id === 'string' ? encodeURIComponent(req.query.id) : '';
  res.redirect(301, LEGACY_PAGES[req.path](id));
});


// ===== REACT APP =====
// `npm run build` (in the project root) builds the React app into client/dist.
// Express serves those files, and every other GET returns index.html so that
// React Router can show the right page for URLs like /admin/inquiries/123.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const indexHtml = path.join(clientDist, 'index.html');

app.use(express.static(clientDist));

app.get('*', (req, res) => {
  if (!fs.existsSync(indexHtml)) {
    return res
      .status(503)
      .send('The React app has not been built yet. Run "npm run build" in the project root, '
        + 'or use "npm run dev" inside client/ while developing.');
  }
  res.sendFile(indexHtml);
});

module.exports = app;
