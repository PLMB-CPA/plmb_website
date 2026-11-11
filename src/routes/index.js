const express = require('express');
const router = express.Router();

const { requireAuth, requireAdminPage, requireClient, requireClientLogin } = require('../middleware/auth');

const adminController = require('../controllers/admin_controller');
const clientController = require('../controllers/client_controller');
const inquiryController = require('../controllers/inquiry_controller');
const newsletterController = require('../controllers/newsletter_controller');
const subscriberController = require('../controllers/subscriber_controller');
const dashboardController = require('../controllers/dashboard_controller');

router.post('/inquiries', inquiryController.createInquiry);
router.post('/inquiries/:id/reply', requireAuth, inquiryController.replyToInquiry);
router.get('/inquiries', requireAuth, inquiryController.getInquiries);
router.get('/inquiries/stats', requireAuth, inquiryController.getInquiryStats);
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

//Subscriber: subscribe to newsletter
router.post('/subscribers', subscriberController.createSubscriber);

//Subscriber: unsubscribe from newsletter
router.get('/unsubscribe/:token', subscriberController.unsubscribe);

// Admin: fetch all subscribers for the dashboard tab
router.get('/admin/subscribers', requireAuth, subscriberController.getSubscribers);

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

// CLIENT ROUTES
router.post('/admin/clients', requireAuth, clientController.createClient);
router.get('/admin/clients', requireAuth, clientController.getClients);

router.post('/client/login', clientController.loginClient);
router.post('/client/logout', clientController.logoutClient);
router.put('/client/password', requireClientLogin, clientController.changeClientPassword);
router.get('/client/me', requireClient, clientController.getCurrentClient);

module.exports = router;
            


