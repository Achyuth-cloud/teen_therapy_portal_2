const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  try {
    const notifications = await Notification.getByUserId(req.user.user_id, { limit, offset });
    const unreadCount = await Notification.getUnreadCount(req.user.user_id);

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const updated = await Notification.markAsRead(req.params.id, req.user.user_id);

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const updatedCount = await Notification.markAllAsRead(req.user.user_id);
    res.json({ message: 'All notifications marked as read', updatedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
