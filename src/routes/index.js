const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {requireAuth, requireAdminPage} = require('../middleware/auth');

const Announcement = require('../models/Announcement');
const Subscriber = require('../models/Subscriber');

const AuthController = require('../controllers/auth_controller');
const inquiryController = require('../controllers/inquiry_controller');

router.post('/inquiries', inquiryController.createInquiry);
router.post('/inquiries/:id/reply', requireAuth, inquiryController.replyToInquiry);
router.get('/inquiries', requireAuth, inquiryController.getInquiries);
router.patch('/inquiries/:id', requireAuth, inquiryController.updateInquiry);

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

//ADMIN ROUTES
router.post('/admin/login', AuthController.postAdminLogin);
router.get('/admin/logout', AuthController.getAdminLogout);

module.exports = router;
            
