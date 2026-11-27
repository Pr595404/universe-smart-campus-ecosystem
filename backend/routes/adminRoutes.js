const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/public-stats', adminController.getPublicStats);
router.get('/analytics', requireAuth, requireRole('admin'), adminController.getAnalytics);
router.post('/announcements', requireAuth, requireRole('admin', 'teacher'), adminController.createAnnouncement);
router.patch('/feedback/:id', requireAuth, requireRole('admin'), adminController.updateFeedbackStatus);
router.patch('/reports/:id', requireAuth, requireRole('admin'), adminController.updateReportStatus);
router.delete('/events/:id', requireAuth, requireRole('admin'), adminController.deleteEvent);
router.delete('/users/:id', requireAuth, requireRole('admin'), adminController.deleteUser);

module.exports = router;
