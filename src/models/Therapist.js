const { pool } = require('../config/database');

class Therapist {
  static async create(therapistData, connection = pool) {
    const {
      user_id,
      specialization,
      experience_years,
      bio = null,
      license_number = null,
      consultation_fee = null
    } = therapistData;

    const [result] = await connection.query(
      `INSERT INTO therapists (user_id, specialization, experience_years, bio, license_number, consultation_fee)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, specialization, experience_years, bio, license_number, consultation_fee]
    );

    return result.insertId;
  }

  static async findByUserId(userId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT t.*, u.full_name, u.email
       FROM therapists t
       JOIN users u ON t.user_id = u.user_id
       WHERE t.user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  }

  static async getTherapistIdByUserId(userId, connection = pool) {
    const therapist = await this.findByUserId(userId, connection);
    return therapist?.therapist_id || null;
  }

  static async findById(therapistId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT t.*, u.full_name, u.email
       FROM therapists t
       JOIN users u ON t.user_id = u.user_id
       WHERE t.therapist_id = ?`,
      [therapistId]
    );
    return rows[0] || null;
  }

  static async findAvailableById(therapistId, connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM therapists WHERE therapist_id = ? AND is_available = TRUE',
      [therapistId]
    );
    return rows[0] || null;
  }

  static async update(therapistId, updates, connection = pool) {
    const fields = [];
    const values = [];
    const allowedFields = [
      'specialization',
      'experience_years',
      'bio',
      'license_number',
      'consultation_fee',
      'is_available'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(therapistId);
    const [result] = await connection.query(
      `UPDATE therapists SET ${fields.join(', ')} WHERE therapist_id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async getWithAppointments(therapistId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT t.*, u.full_name, u.email,
              COUNT(DISTINCT a.appointment_id) AS total_appointments,
              SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
              SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_appointments,
              COUNT(DISTINCT s.student_id) AS total_students
       FROM therapists t
       JOIN users u ON t.user_id = u.user_id
       LEFT JOIN appointments a ON t.therapist_id = a.therapist_id
       LEFT JOIN students s ON a.student_id = s.student_id
       WHERE t.therapist_id = ?
       GROUP BY t.therapist_id`,
      [therapistId]
    );
    return rows[0] || null;
  }

  static async findAll(options = {}, connection = pool) {
    const { limit = null, offset = null, available = null, search = null } = options;
    let query = `
      SELECT t.*, u.full_name, u.email
      FROM therapists t
      JOIN users u ON t.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (available !== null) {
      query += ' AND t.is_available = ?';
      params.push(available);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR t.specialization LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.experience_years DESC';

    if (limit !== null && offset !== null) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async getAvailability(therapistId, startDate, endDate, connection = pool) {
    let query = `
      SELECT *
      FROM availability
      WHERE therapist_id = ?
      AND is_booked = FALSE
    `;
    const params = [therapistId];

    if (startDate) {
      query += ' AND available_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND available_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY available_date ASC, start_time ASC';

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async addAvailability(therapistId, availableDate, startTime, endTime, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO availability (therapist_id, available_date, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [therapistId, availableDate, startTime, endTime]
    );

    return result.insertId;
  }

  static async hasAvailabilitySlot(therapistId, availableDate, startTime, connection = pool) {
    const [rows] = await connection.query(
      'SELECT availability_id FROM availability WHERE therapist_id = ? AND available_date = ? AND start_time = ?',
      [therapistId, availableDate, startTime]
    );
    return rows.length > 0;
  }

  static async removeAvailability(availabilityId, therapistId, connection = pool) {
    const [result] = await connection.query(
      'DELETE FROM availability WHERE availability_id = ? AND therapist_id = ?',
      [availabilityId, therapistId]
    );

    return result.affectedRows > 0;
  }

  static async getStats(therapistId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT
         COUNT(DISTINCT a.student_id) AS total_students,
         SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
         SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
         SUM(CASE WHEN a.status = 'approved' AND a.appointment_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_sessions,
         COUNT(DISTINCT sn.note_id) AS session_notes_count
       FROM therapists t
       LEFT JOIN appointments a ON t.therapist_id = a.therapist_id
       LEFT JOIN session_notes sn ON a.appointment_id = sn.appointment_id
       WHERE t.therapist_id = ?`,
      [therapistId]
    );
    return rows[0];
  }

  static async delete(therapistId, connection = pool) {
    const [result] = await connection.query('DELETE FROM therapists WHERE therapist_id = ?', [therapistId]);
    return result.affectedRows > 0;
  }
}

module.exports = Therapist;
