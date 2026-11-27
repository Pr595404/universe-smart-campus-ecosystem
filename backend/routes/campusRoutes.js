const express = require('express');
const router = express.Router();
const campusController = require('../controllers/campusController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { uploadImage, uploadDocument } = require('../middleware/upload');

// Events
router.get('/events', optionalAuth, campusController.getEvents);
router.post('/events', requireAuth, requireRole('teacher', 'admin'), campusController.createEvent);
router.post('/events/:id/register', requireAuth, campusController.toggleEventRegistration);

// Lost & Found
router.get('/lost-found', campusController.getLostFound);
router.post('/lost-found', requireAuth, uploadImage.single('image'), campusController.createLostFound);
router.patch('/lost-found/:id/recover', requireAuth, campusController.markLostFoundRecovered);

// StudyHub
router.get('/resources', optionalAuth, campusController.getResources);
router.post('/resources', requireAuth, uploadDocument.single('document'), campusController.uploadResource);
router.post('/resources/:id/download', optionalAuth, campusController.recordDownload);
router.post('/resources/:id/bookmark', requireAuth, campusController.toggleBookmark);

// SkillSphere
router.get('/skillsphere', optionalAuth, campusController.getSkillSphereData);
router.post('/skills', requireAuth, campusController.addSkill);
router.delete('/skills/:id', requireAuth, campusController.deleteSkill);
router.post('/projects', requireAuth, campusController.createProjectIdea);
router.post('/collaborations', requireAuth, campusController.sendCollabRequest);
router.patch('/collaborations/:id', requireAuth, campusController.respondCollabRequest);

// Campus Quest
router.get('/quests', optionalAuth, campusController.getQuestData);

// Anonymous Voice
router.get('/feedback', campusController.getFeedback);
router.post('/feedback', campusController.createFeedback);
router.post('/feedback/:id/like', campusController.likeFeedback);

// Marketplace
router.get('/marketplace', campusController.getMarketplace);
router.post('/marketplace', requireAuth, uploadImage.single('image'), campusController.createMarketplaceItem);
router.patch('/marketplace/:id/sold', requireAuth, campusController.markMarketplaceSold);

// Protected Contact
router.post('/messages', requireAuth, campusController.sendProtectedMessage);

module.exports = router;
