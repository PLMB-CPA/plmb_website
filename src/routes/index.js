const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {requireAuth, requireAdminPage, requireClient, requireClientLogin} = require('../middleware/auth');

const Subscriber = require('../models/Subscriber');

const adminController = require('../controllers/admin_controller');
const clientController = require('../controllers/client_controller');
const inquiryController = require('../controllers/inquiry_controller');
const newsletterController = require('../controllers/newsletter_controller');
const dashboardController = require('../controllers/dashboard_controller');

router.post('/inquiries', inquiryController.createInquiry);
router.post('/inquiries/:id/reply', requireAuth, inquiryController.replyToInquiry);
router.get('/inquiries', requireAuth, inquiryController.getInquiries);
router.get('/inquiries/:id', requireAuth, inquiryController.getInquiryById);
router.patch('/inquiries/:id', requireAuth, inquiryController.updateInquiry);
router.delete('/inquiries/:id', requireAuth, inquiryController.deleteInquiry);

// NEWSLETTER ROUTES
// Public: used by index.html to show published newsletters
router.get('/announcements', newsletterController.getPublishedNewsletters);

// Public: used by newsletter.html to show specific newsletters
router.get('/newsletter/:id', newsletterController.getNewsletterById);

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

//ADMIN DASHBOARD ROUTES
router.get('/admin/stats', requireAuth, dashboardController.getAdminStat);

//ADMIN LOGIN/LOGOUTROUTES
router.post('/admin/login', adminController.postAdminLogin);
router.get('/admin/logout', adminController.getAdminLogout);
router.get('/admin/username', requireAuth, adminController.getAdminUsername);
// ADMIN MANAGEMENT ROUTES
router.post('/admin/users', requireAuth, adminController.addAdmin);
router.get('/admin/users', requireAuth, adminController.getAdmins);
router.delete('/admin/users/:id', requireAuth, adminController.deleteAdmin);
router.put('/admin/users/:id/password', requireAuth, adminController.changeAdminPassword);



//CLIENT ROUTES

// Admin only: the office creates client accounts (no public sign-up)
router.post('/admin/clients', requireAuth, clientController.createClient);

router.post('/client/login', clientController.loginClient);
router.post('/client/logout', clientController.logoutClient);
// requireClientLogin: still reachable while the temporary password is active
router.put('/client/password', requireClientLogin, clientController.changeClientPassword);
router.get('/client/me', requireClient, clientController.getCurrentClient);

module.exports = router;
            


