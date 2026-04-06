const { pool } = require('../config/database');

class Notification {
  static async getByUserId(userId, { limit = 20, offset = 0 } = {}, connection = pool) {
    const [rows] = await connection.query(
      `SELECT notification_id, user_id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );

    return rows;
  }

  static async getUnreadCount(userId, connection = pool) {
    const [[row]] = await connection.query(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return row.unread_count;
  }

  static async markAsRead(notificationId, userId, connection = pool) {
    const [result] = await connection.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId, connection = pool) {
    const [result] = await connection.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return result.affectedRows;
  }
}

module.exports = Notification;
