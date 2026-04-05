const { pool } = require('../config/database');

class Appointment {
  static async create(appointmentData, connection = pool) {
    const {
      student_id,
      therapist_id,
      appointment_date,
      appointment_time,
      reason = null,
      availability_id = null,
      status = 'pending'
    } = appointmentData;

    const [result] = await connection.query(
      `INSERT INTO appointments (student_id, therapist_id, availability_id, appointment_date, appointment_time, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, therapist_id, availability_id, appointment_date, appointment_time, reason, status]
    );

    return result.insertId;
  }

  static async findById(appointmentId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT a.*,
              s_full.full_name AS student_name,
              t_full.full_name AS therapist_name,
              t.specialization
       FROM appointments a
       JOIN students s ON a.student_id = s.student_id
       JOIN users s_full ON s.user_id = s_full.user_id
       JOIN therapists t ON a.therapist_id = t.therapist_id
       JOIN users t_full ON t.user_id = t_full.user_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );
    return rows[0] || null;
  }

  static async getStudentAppointments(studentId, options = {}, connection = pool) {
    const { status = null, limit = null, offset = null } = options;
    let query = `
      SELECT a.*,
             u.full_name AS therapist_name,
             t.specialization,
             sn.notes AS session_notes
      FROM appointments a
      JOIN therapists t ON a.therapist_id = t.therapist_id
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN session_notes sn ON a.appointment_id = sn.appointment_id
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    if (limit !== null && offset !== null) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async getTherapistAppointments(therapistId, options = {}, connection = pool) {
    const { status = null, limit = null, offset = null } = options;
    let query = `
      SELECT a.*,
             u.full_name AS student_name,
             s.age,
             s.gender,
             MAX(wr.average_score) AS wellbeing_score
      FROM appointments a
      JOIN students s ON a.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN wellbeing_responses wr ON s.student_id = wr.student_id
      WHERE a.therapist_id = ?
    `;
    const params = [therapistId];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' GROUP BY a.appointment_id, u.full_name, s.age, s.gender';
    query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';

    if (limit !== null && offset !== null) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async updateStatus(appointmentId, status, meetingLink = null, connection = pool) {
    const [result] = await connection.query(
      'UPDATE appointments SET status = ?, meeting_link = COALESCE(?, meeting_link) WHERE appointment_id = ?',
      [status, meetingLink, appointmentId]
    );

    return result.affectedRows > 0;
  }

  static async cancel(appointmentId, connection = pool) {
    const [result] = await connection.query(
      'UPDATE appointments SET status = ? WHERE appointment_id = ?',
      ['cancelled', appointmentId]
    );

    return result.affectedRows > 0;
  }

  static async checkConflict(therapistId, appointmentDate, appointmentTime, excludeId = null, connection = pool) {
    let query = `
      SELECT *
      FROM appointments
      WHERE therapist_id = ?
      AND appointment_date = ?
      AND appointment_time = ?
      AND status IN ('pending', 'approved')
    `;
    const params = [therapistId, appointmentDate, appointmentTime];

    if (excludeId) {
      query += ' AND appointment_id != ?';
      params.push(excludeId);
    }

    const [rows] = await connection.query(query, params);
    return rows.length > 0;
  }

  static async getUpcoming(userId, role, connection = pool) {
    let query;
    let params;

    if (role === 'student') {
      query = `
        SELECT a.*, u.full_name AS therapist_name
        FROM appointments a
        JOIN therapists t ON a.therapist_id = t.therapist_id
        JOIN users u ON t.user_id = u.user_id
        JOIN students s ON a.student_id = s.student_id
        WHERE s.user_id = ?
        AND a.status = 'approved'
        AND a.appointment_date >= CURDATE()
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
        LIMIT 5
      `;
      params = [userId];
    } else {
      query = `
        SELECT a.*, u.full_name AS student_name
        FROM appointments a
        JOIN students s ON a.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN therapists t ON a.therapist_id = t.therapist_id
        WHERE t.user_id = ?
        AND a.status = 'approved'
        AND a.appointment_date >= CURDATE()
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
        LIMIT 5
      `;
      params = [userId];
    }

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async getStats(connection = pool) {
    const [rows] = await connection.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM appointments
    `);
    return rows[0];
  }

  static async getAnalytics(period, connection = pool) {
    let groupBy;
    switch (period) {
      case 'daily':
        groupBy = 'DATE(appointment_date)';
        break;
      case 'weekly':
        groupBy = 'YEARWEEK(appointment_date)';
        break;
      default:
        groupBy = 'DATE_FORMAT(appointment_date, "%Y-%m")';
    }

    const [rows] = await connection.query(`
      SELECT
        ${groupBy} AS period,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM appointments
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `);

    return rows;
  }

  static async findForTherapistAction(appointmentId, therapistId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT a.*, s.user_id, u.email, u.full_name
       FROM appointments a
       JOIN students s ON a.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE a.appointment_id = ? AND a.therapist_id = ?`,
      [appointmentId, therapistId]
    );
    return rows[0] || null;
  }

  static async findForStudentCancellation(appointmentId, studentId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT a.*, t.user_id, u.email, u.full_name
       FROM appointments a
       JOIN therapists t ON a.therapist_id = t.therapist_id
       JOIN users u ON t.user_id = u.user_id
       WHERE a.appointment_id = ?
       AND a.student_id = ?
       AND a.status IN ('pending', 'approved')`,
      [appointmentId, studentId]
    );
    return rows[0] || null;
  }

  static async delete(appointmentId, connection = pool) {
    const [result] = await connection.query('DELETE FROM appointments WHERE appointment_id = ?', [appointmentId]);
    return result.affectedRows > 0;
  }
}

module.exports = Appointment;
