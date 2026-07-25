require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const app = express();
const {requireAdminPage} = require('./middleware/auth');

app.use(cors());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// add routes here when developed
app.get('/admin_dashboard.html', requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin_dashboard.html'));
});

app.use(express.static(path.join(__dirname, 'views')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/image', express.static(path.join(__dirname, 'image')));

app.get('/', (req, res) => {
  res.send('PLMB API is running');
});

module.exports = app;
