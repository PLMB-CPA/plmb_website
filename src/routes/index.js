const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {requireAuth, requireAdminPage} = require('../middleware/auth');

const Subscriber = require('../models/Subscriber');

const AuthController = require('../controllers/auth_controller');
const inquiryController = require('../controllers/inquiry_controller');
const newsletterController = require('../controllers/newsletter_controller');

router.post('/inquiries', inquiryController.createInquiry);
router.post('/inquiries/:id/reply', requireAuth, inquiryController.replyToInquiry);
router.get('/inquiries', requireAuth, inquiryController.getInquiries);
router.patch('/inquiries/:id', requireAuth, inquiryController.updateInquiry);

// NEWSLETTER ROUTES
// Public: used by index.html to show published newsletters
router.get('/announcements', newsletterController.getPublishedNewsletters);

// Admin: full list regardless of publish status
router.get('/announcements/all', requireAuth, newsletterController.getAllNewsletters);
            
// Admin: single newsletter, for an edit form 
router.get('/announcements/:id', requireAuth, newsletterController.getNewsletterById);

// Admin: create a new newsltter (draft or published)
router.post('/announcements', requireAuth, newsletterController.createNewsletter);

// Admin: edit/publish/unpublish
router.patch('/announcements/:id', requireAuth, newsletterController.updateNewsletter);

// Admin: delete a newsltter
router.delete('/announcements/:id', requireAuth, newsletterController.deleteNewsletter);
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

//ADMIN LOGIN/LOGOUTROUTES
router.post('/admin/login', AuthController.postAdminLogin);
router.get('/admin/logout', AuthController.getAdminLogout);
// ADMIN MANAGEMENT ROUTES
router.post('/admin/users', requireAuth, AuthController.addAdmin);
router.get('/admin/users', requireAuth, AuthController.getAdmins);
router.delete('/admin/users/:id', requireAuth, AuthController.deleteAdmin);
router.put('/admin/users/:id/password', requireAuth, AuthController.changeAdminPassword);

module.exports = router;
            
