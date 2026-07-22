const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/auth');

const Inquiry = require('../models/Inquiry');
const Consultation = require('../models/Consultation');
const Announcement = require('../models/Announcement');
const Subscriber = require('../models/Subscriber');
const Admin = require('../models/Admin');


// INQUIRY ROUTES 
router.post('/inquiries', async (req, res) => { 
  try { 
    const count = await Inquiry.countDocuments();
    const ticketNumber = `INQ-${String(count + 1).padStart(4, '0')}`;
    const inquiry = await Inquiry.create({...req.body, ticketNumber}); 
    res.status(201).json({message: 'Your inquiry has been recorded.', inquiry});
  } catch (err) { 
    res.status(400).json({error: err.message}); 
  } 
});

router.get('/inquiries', requireAuth, async (req, res) => {
  try {
    const filter = {isAnswered: false};
    if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
    if (req.query.isAnswered !== undefined) filter.isAnswered = req.query.isAnswered === 'true';
    const inquiries = await Inquiry.find(filter).sort({date: 1});
    res.status(200).json({message: 'Inquiries found', inquiries});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

router.patch('/inquiries/:id', requireAuth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({message: 'Inquiry updated', inquiry});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

// CONSULTATION ROUTES 
router.post('/consultation', async (req, res) => { 
  try { 
    const count = await Consultation.countDocuments();
    const ticketNumber = `CNS-${String(count + 1).padStart(2, '0')}`;
    const consultation = await Consultation.create({...req.body, ticketNumber}); 
    res.status(201).json({message: 'Your consultation has been recorded.', consultation});
  } catch (err) { 
    res.status(400).json({error: err.message}); 
  } 
});

router.get('/consultation', requireAuth, async (req, res) => {
  try {
    const filter = {isAnswered: false};
    if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
    if (req.query.isAnswered !== undefined) filter.isAnswered = req.query.isAnswered === 'true';
    const consultation = await Consultation.find(filter).sort({date: 1});
    res.status(200).json({message: 'Consultation found', consultation});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

router.patch('/consultation/:id', requireAuth, async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({message: 'Consultation updated', consultation});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});
           
// ANNOUNCEMENT ROUTES
router.post('/announcements', requireAuth, async (req, res) => {
  try {
    const announcements = await Announcement.create(req.body);
    res.status(201).json({message: 'Announcement created', announcements});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({isPublished: true}).sort({date: -1});
    res.status(200).json({message: 'Announcement found', announcements});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

router.patch('/announcements/:id', requireAuth, async (req, res) => {
  try {
    const announcements = await Announcement.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({message: 'Announcement updated', announcements});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});
             
// SUBSCRIBER ROUTES

router.post('/subscribers', async (req, res) => {
  try {
    const subscriber = await Subscriber.create(req.body);
    res.status(201).json({message: 'Thank you for subscribing', subscriber});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
  });

router.get('/unsubscribe', async (req, res) => {
  try {
    const subscriber = await Subscriber.findOneAndDelete({email: req.query.email});
    res.status(200).json({message: 'Unsubscribed', subscriber});
} catch (err) {
  res.status(400).json({error: err.message});
  }
});

// ADMIN ROUTES
router.post('/admin/login', async (req, res) => {
  try {
    const admin = await Admin.findOne({username: req.body.username});
    if (!admin) return res.status(404).json({error: 'Admin not found'});

    const isMatch = await bcrypt.compare(req.body.password, admin.password);
    if (!isMatch) return res.status(401).json({error: 'Invalid password'});

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {expiresIn: '1d'});
    res.status(200).json({message: 'Login successful', token});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
});

module.exports = router;
            
