const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, asyncHandler(notificationController.getNotifications));
router.patch('/read-all', authMiddleware, asyncHandler(notificationController.markAllAsRead));
router.patch('/:id/read', authMiddleware, asyncHandler(notificationController.markAsRead));

module.exports = router;
