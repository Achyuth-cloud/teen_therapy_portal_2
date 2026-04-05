const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData, connection = pool) {
    const { full_name, email, password, role = 'student', hashPassword = true } = userData;
    const finalPassword = hashPassword ? await bcrypt.hash(password, 10) : password;

    const [result] = await connection.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [full_name, email, finalPassword, role]
    );

    return {
      user_id: result.insertId,
      full_name,
      email,
      role
    };
  }

  static async findByEmail(email, connection = pool) {
    const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async findById(userId, connection = pool) {
    const [rows] = await connection.query(
      'SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  static async findByIdWithPassword(userId, connection = pool) {
    const [rows] = await connection.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    return rows[0] || null;
  }

  static async update(userId, updates, connection = pool) {
    const fields = [];
    const values = [];

    if (updates.full_name) {
      fields.push('full_name = ?');
      values.push(updates.full_name);
    }

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (updates.password) {
      fields.push('password = ?');
      values.push(await bcrypt.hash(updates.password, 10));
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(userId);
    const [result] = await connection.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async updatePassword(userId, password, connection = pool) {
    const [result] = await connection.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [password, userId]
    );
    return result.affectedRows > 0;
  }

  static async delete(userId, connection = pool) {
    const [result] = await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  }

  static async findAll(options = {}, connection = pool) {
    const { role = null, search = null, limit = null, offset = null } = options;
    let query = `
      SELECT u.user_id, u.full_name, u.email, u.role, u.created_at,
             CASE
               WHEN u.role = 'student' THEN s.age
               WHEN u.role = 'therapist' THEN t.experience_years
               ELSE NULL
             END AS extra_info
      FROM users u
      LEFT JOIN students s ON u.user_id = s.user_id
      LEFT JOIN therapists t ON u.user_id = t.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    if (limit !== null && offset !== null) {
      query += ' LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
    }

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async verifyPassword(email, password, connection = pool) {
    const user = await this.findByEmail(email, connection);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  static async changePassword(userId, currentPassword, newPassword, connection = pool) {
    const user = await this.findByIdWithPassword(userId, connection);
    if (!user) {
      return false;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.updatePassword(userId, hashedPassword, connection);
    return true;
  }

  static async count(role = null, connection = pool) {
    let query = 'SELECT COUNT(*) AS count FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    const [rows] = await connection.query(query, params);
    return rows[0].count;
  }

  static async logAction({ user_id = null, action, ip_address = null, details = null }, connection = pool) {
    await connection.query(
      'INSERT INTO system_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user_id, action, details ? JSON.stringify(details) : null, ip_address]
    );
  }

  static async getSystemStats(connection = pool) {
    const [rows] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'therapist') AS total_therapists,
        (SELECT COUNT(*) FROM appointments) AS total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'pending') AS pending_appointments,
        (SELECT COUNT(*) FROM wellbeing_responses) AS total_wellbeing_responses,
        (SELECT AVG(average_score) FROM wellbeing_responses) AS avg_wellbeing_score
    `);
    return rows[0];
  }

  static async getSystemLogs({ limit = 100, offset = 0 } = {}, connection = pool) {
    const [logs] = await connection.query(
      `SELECT l.*, u.full_name, u.email
       FROM system_logs l
       LEFT JOIN users u ON l.user_id = u.user_id
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM system_logs');

    return {
      logs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    };
  }
}

module.exports = User;
