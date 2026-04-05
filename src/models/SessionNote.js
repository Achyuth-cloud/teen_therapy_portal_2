const { pool } = require('../config/database');

class SessionNote {
  // Create session note
  static async create(noteData) {
    const { appointment_id, therapist_id, notes, recommendations = null, next_session_date = null } = noteData;
    
    const [result] = await pool.query(
      `INSERT INTO session_notes (appointment_id, therapist_id, notes, recommendations, next_session_date)
       VALUES (?, ?, ?, ?, ?)`,
      [appointment_id, therapist_id, notes, recommendations, next_session_date]
    );
    
    return result.insertId;
  }

  // Find note by ID
  static async findById(noteId) {
    const [rows] = await pool.query(
      `SELECT sn.*, 
              a.appointment_date, a.appointment_time,
              s_full.full_name as student_name,
              t_full.full_name as therapist_name
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN users s_full ON s.user_id = s_full.user_id
       JOIN therapists t ON a.therapist_id = t.therapist_id
       JOIN users t_full ON t.user_id = t_full.user_id
       WHERE sn.note_id = ?`,
      [noteId]
    );
    return rows[0];
  }

  // Find note by appointment ID
  static async findByAppointmentId(appointmentId) {
    const [rows] = await pool.query(
      `SELECT sn.*, 
              a.appointment_date, a.appointment_time,
              u.full_name as therapist_name
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       JOIN therapists t ON a.therapist_id = t.therapist_id
       JOIN users u ON t.user_id = u.user_id
       WHERE sn.appointment_id = ?`,
      [appointmentId]
    );
    return rows[0];
  }

  // Get student's session notes
  static async getStudentNotes(studentId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    
    const [rows] = await pool.query(
      `SELECT sn.*, 
              a.appointment_date, a.appointment_time,
              u.full_name as therapist_name
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       JOIN therapists t ON a.therapist_id = t.therapist_id
       JOIN users u ON t.user_id = u.user_id
       WHERE a.student_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT ? OFFSET ?`,
      [studentId, limit, offset]
    );
    return rows;
  }

  // Get therapist's session notes
  static async getTherapistNotes(therapistId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    
    const [rows] = await pool.query(
      `SELECT sn.*, 
              a.appointment_date, a.appointment_time,
              u.full_name as student_name
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE sn.therapist_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT ? OFFSET ?`,
      [therapistId, limit, offset]
    );
    return rows;
  }

  // Update session note
  static async update(noteId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.notes) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    
    if (updates.recommendations !== undefined) {
      fields.push('recommendations = ?');
      values.push(updates.recommendations);
    }
    
    if (updates.next_session_date !== undefined) {
      fields.push('next_session_date = ?');
      values.push(updates.next_session_date);
    }
    
    if (fields.length === 0) return false;
    
    values.push(noteId);
    const [result] = await pool.query(
      `UPDATE session_notes SET ${fields.join(', ')} WHERE note_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  // Check if note exists for appointment
  static async existsForAppointment(appointmentId) {
    const [rows] = await pool.query(
      'SELECT * FROM session_notes WHERE appointment_id = ?',
      [appointmentId]
    );
    return rows.length > 0;
  }

  // Get notes by date range
  static async getByDateRange(therapistId, startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT sn.*, 
              a.appointment_date,
              u.full_name as student_name
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE sn.therapist_id = ?
       AND a.appointment_date BETWEEN ? AND ?
       ORDER BY a.appointment_date ASC`,
      [therapistId, startDate, endDate]
    );
    return rows;
  }

  // Delete session note
  static async delete(noteId) {
    const [result] = await pool.query('DELETE FROM session_notes WHERE note_id = ?', [noteId]);
    return result.affectedRows > 0;
  }

  // Get note statistics
  static async getStats(therapistId) {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(*) as total_notes,
         COUNT(DISTINCT a.student_id) as unique_students,
         AVG(CASE WHEN recommendations IS NOT NULL THEN 1 ELSE 0 END) * 100 as recommendations_rate
       FROM session_notes sn
       JOIN appointments a ON sn.appointment_id = a.appointment_id
       WHERE sn.therapist_id = ?`,
      [therapistId]
    );
    return rows[0];
  }
}

module.exports = SessionNote;