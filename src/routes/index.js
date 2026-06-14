const express = require('express');
const router = express.Router();

const Inquiry = require('../models/Inquiry');
const Announcement = require('../models/Announcement');
const Subscriber = require('../models/Subscriber');
const Admin = require('../models/Admin');


// INQUIRY ROUTES 
router.post('/inquiries', async (req, res) => { 
  try { 
    const inquiry = await Inquiry.create(req.body); 
    res.status(201).json({message: 'Your inquiry has been recorded. Please wait for someone to get back to you within 5 working days.', inquiry});
  } catch (err) { 
    res.status(400).json({error: err.message}); 
  } 
});
// ANNOUNCEMENT ROUTES

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

            
