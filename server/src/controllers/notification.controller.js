const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');

const getNotifications = async (req, res) => {
  const { unread, page = 1, limit = 30 } = req.query;

  const filter = { userId: req.user._id };
  if (unread === 'true') {
    filter.isRead = false;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10));

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false
  });

  return ApiResponse.success(res, {
    notifications,
    unreadCount
  });
};

const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  return ApiResponse.success(res, { notification }, 'Notification marked as read');
};

const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return ApiResponse.success(res, {}, 'All notifications marked as read');
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
