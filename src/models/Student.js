const { pool } = require('../config/database');

class Student {
  static async create(studentData, connection = pool) {
    const { user_id, age, gender, emergency_contact = null } = studentData;

    const [result] = await connection.query(
      'INSERT INTO students (user_id, age, gender, emergency_contact) VALUES (?, ?, ?, ?)',
      [user_id, age, gender, emergency_contact]
    );

    return result.insertId;
  }

  static async findByUserId(userId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT s.*, u.full_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  }

  static async findById(studentId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT s.*, u.full_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.student_id = ?`,
      [studentId]
    );
    return rows[0] || null;
  }

  static async getStudentIdByUserId(userId, connection = pool) {
    const student = await this.findByUserId(userId, connection);
    return student?.student_id || null;
  }

  static async update(studentId, updates, connection = pool) {
    const fields = [];
    const values = [];

    if (updates.age) {
      fields.push('age = ?');
      values.push(updates.age);
    }

    if (updates.gender) {
      fields.push('gender = ?');
      values.push(updates.gender);
    }

    if (updates.emergency_contact) {
      fields.push('emergency_contact = ?');
      values.push(updates.emergency_contact);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(studentId);
    const [result] = await connection.query(
      `UPDATE students SET ${fields.join(', ')} WHERE student_id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async getWithAppointments(studentId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT s.*, u.full_name, u.email,
              COUNT(DISTINCT a.appointment_id) AS total_appointments,
              SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
              SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_appointments
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN appointments a ON s.student_id = a.student_id
       WHERE s.student_id = ?
       GROUP BY s.student_id`,
      [studentId]
    );
    return rows[0] || null;
  }

  static async findAll(options = {}, connection = pool) {
    const { limit = 10, offset = 0, search = null } = options;
    let query = `
      SELECT s.*, u.full_name, u.email
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await connection.query(query, params);
    return rows;
  }

  static async getStats(studentId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT
         COUNT(DISTINCT a.appointment_id) AS total_sessions,
         SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
         SUM(CASE WHEN a.status = 'approved' AND a.appointment_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_sessions,
         AVG(wr.average_score) AS avg_wellbeing_score,
         COUNT(DISTINCT wr.response_id) AS wellbeing_checks
       FROM students s
       LEFT JOIN appointments a ON s.student_id = a.student_id
       LEFT JOIN wellbeing_responses wr ON s.student_id = wr.student_id
       WHERE s.student_id = ?`,
      [studentId]
    );
    return rows[0];
  }

  static async delete(studentId, connection = pool) {
    const [result] = await connection.query('DELETE FROM students WHERE student_id = ?', [studentId]);
    return result.affectedRows > 0;
  }
}

module.exports = Student;
