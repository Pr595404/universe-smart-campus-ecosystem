const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.get('/dashboard', requireAuth, communityController.getDashboardSummary);
router.get('/posts', optionalAuth, communityController.getPosts);
router.post('/posts', requireAuth, uploadImage.single('image'), communityController.createPost);
router.post('/posts/:id/like', requireAuth, communityController.toggleLike);
router.post('/posts/:id/comments', requireAuth, communityController.addComment);
router.delete('/posts/:id', requireAuth, communityController.deletePost);

router.get('/announcements', communityController.getAnnouncements);
router.post('/reports', requireAuth, communityController.createReport);

router.post('/tasks', requireAuth, communityController.createTask);
router.patch('/tasks/:id/toggle', requireAuth, communityController.toggleTask);
router.delete('/tasks/:id', requireAuth, communityController.deleteTask);

router.get('/notifications', requireAuth, communityController.getNotifications);
router.post('/notifications/read', requireAuth, communityController.markNotificationsRead);

module.exports = router;
