const express = require('express');
const router = express.Router();
const { requireAuth, requireMainAdmin, requireAdminPage, requireClient, requireClientLogin } = require('../middleware/auth');
const { inquiryLimiter, subscriberLimiter,adminRecoveryLimiter, adminResetLimiter} = require('../middleware/rateLimit');
const adminController = require('../controllers/admin_controller');
const adminRecoveryController = require('../controllers/admin_recovery_controller');
const clientController = require('../controllers/client_controller');
const inquiryController = require('../controllers/inquiry_controller');
const newsletterController = require('../controllers/newsletter_controller');
const subscriberController = require('../controllers/subscriber_controller');
const remittanceController = require('../controllers/remittance_controller');
const dashboardController = require('../controllers/dashboard_controller');

router.post('/inquiries', inquiryLimiter, inquiryController.createInquiry);
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
router.post('/subscribers', subscriberLimiter, subscriberController.createSubscriber);

//Subscriber: unsubscribe from newsletter
router.get('/unsubscribe/:token', subscriberController.unsubscribe);

// Admin: fetch all subscribers
router.get('/admin/subscribers', requireAuth, subscriberController.getSubscribers);

// REMITTANCE ROUTES

// Admin: fetch all remittances, create records, update statuses
router.get('/admin/remittances', requireAuth, remittanceController.getAdminRemittances);
router.post('/admin/remittances', requireAuth, remittanceController.addRemittanceRecord);
router.put('/admin/remittances/:id', requireAuth, remittanceController.updateRemittanceStatus);
router.delete('/admin/remittances/:id', requireAuth, remittanceController.deleteRemittance);


// Client: fetch only the logged-in client's remittances
router.get('/client/remittances', requireClient, remittanceController.getClientRemittances);

// ADMIN DASHBOARD ROUTES
router.get('/admin/stats', requireAuth, dashboardController.getAdminStat);

// Client-Side Inquiries
router.get('/client/inquiries', requireClient, inquiryController.getClientInquiries);

//ADMIN LOGIN/LOGOUTROUTES
router.post('/admin/recovery/request', adminRecoveryLimiter, adminRecoveryController.requestRecovery);

// F08 - Reset password using recovery token
router.post('/admin/recovery/reset', adminResetLimiter, adminRecoveryController.resetPassword);
router.post('/admin/login', adminController.postAdminLogin);
router.get('/admin/logout', adminController.getAdminLogout);
router.get('/admin/me', requireAuth, adminController.getCurrentAdmin);
router.put('/admin/me', requireAuth, adminController.updateCurrentAdmin);
router.put('/admin/me/password', requireAuth, adminController.changeOwnPassword);
router.put('/admin/me/preferences', requireAuth, adminController.updatePreferences);
// ADMIN MANAGEMENT ROUTES
router.post('/admin/users', requireMainAdmin, adminController.addAdmin);
router.get('/admin/users', requireMainAdmin, adminController.getAdmins);
router.delete('/admin/users/:id', requireMainAdmin, adminController.deleteAdmin);
router.put('/admin/users/:id/password', requireMainAdmin, adminController.changeAdminPassword);
router.put('/admin/users/:id/main', requireMainAdmin, adminController.setMainAdmin);

// CLIENT ROUTES
router.post('/admin/clients', requireAuth, clientController.createClient);
router.get('/admin/clients', requireAuth, clientController.getClients);

router.post('/client/login', clientController.loginClient);
router.post('/client/logout', clientController.logoutClient);
router.put('/client/password', requireClientLogin, clientController.changeClientPassword);
router.get('/client/me', requireClient, clientController.getCurrentClient);

module.exports = router;
            


