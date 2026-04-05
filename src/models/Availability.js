const { pool } = require('../config/database');

class Availability {
  // Create availability slot
  static async create(availabilityData) {
    const { therapist_id, available_date, start_time, end_time } = availabilityData;
    
    const [result] = await pool.query(
      `INSERT INTO availability (therapist_id, available_date, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [therapist_id, available_date, start_time, end_time]
    );
    
    return result.insertId;
  }

  // Find availability by ID
  static async findById(availabilityId) {
    const [rows] = await pool.query(
      `SELECT a.*, t.user_id 
       FROM availability a
       JOIN therapists t ON a.therapist_id = t.therapist_id
       WHERE a.availability_id = ?`,
      [availabilityId]
    );
    return rows[0];
  }

  // Get therapist availability
  static async getTherapistAvailability(therapistId, options = {}) {
    const { startDate = null, endDate = null, includeBooked = false } = options;
    let query = 'SELECT * FROM availability WHERE therapist_id = ?';
    const params = [therapistId];
    
    if (!includeBooked) {
      query += ' AND is_booked = FALSE';
    }
    
    if (startDate) {
      query += ' AND available_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND available_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY available_date ASC, start_time ASC';
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Get available slots for a specific date
  static async getAvailableSlots(therapistId, date) {
    const [rows] = await pool.query(
      `SELECT * FROM availability 
       WHERE therapist_id = ? 
       AND available_date = ? 
       AND is_booked = FALSE
       ORDER BY start_time ASC`,
      [therapistId, date]
    );
    return rows;
  }

  // Mark slot as booked
  static async markAsBooked(availabilityId) {
    const [result] = await pool.query(
      'UPDATE availability SET is_booked = TRUE WHERE availability_id = ?',
      [availabilityId]
    );
    return result.affectedRows > 0;
  }

  // Mark slot as available
  static async markAsAvailable(availabilityId) {
    const [result] = await pool.query(
      'UPDATE availability SET is_booked = FALSE WHERE availability_id = ?',
      [availabilityId]
    );
    return result.affectedRows > 0;
  }

  // Delete availability slot
  static async delete(availabilityId, therapistId = null) {
    let query = 'DELETE FROM availability WHERE availability_id = ?';
    const params = [availabilityId];
    
    if (therapistId) {
      query += ' AND therapist_id = ?';
      params.push(therapistId);
    }
    
    const [result] = await pool.query(query, params);
    return result.affectedRows > 0;
  }

  // Delete past availability
  static async deletePast() {
    const [result] = await pool.query(
      'DELETE FROM availability WHERE available_date < CURDATE()'
    );
    return result.affectedRows;
  }

  // Check if slot exists and is available
  static async isAvailable(availabilityId) {
    const [rows] = await pool.query(
      'SELECT * FROM availability WHERE availability_id = ? AND is_booked = FALSE',
      [availabilityId]
    );
    return rows.length > 0;
  }

  // Get availability by date range
  static async getByDateRange(therapistId, startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT * FROM availability 
       WHERE therapist_id = ? 
       AND available_date BETWEEN ? AND ?
       ORDER BY available_date ASC, start_time ASC`,
      [therapistId, startDate, endDate]
    );
    return rows;
  }

  // Bulk create availability slots
  static async bulkCreate(availabilitySlots) {
    if (!availabilitySlots.length) return [];
    
    const values = availabilitySlots.map(slot => 
      [slot.therapist_id, slot.available_date, slot.start_time, slot.end_time]
    );
    
    const [result] = await pool.query(
      `INSERT INTO availability (therapist_id, available_date, start_time, end_time)
       VALUES ?`,
      [values]
    );
    
    return result.insertId;
  }

  // Generate recurring availability
  static async generateRecurring(therapistId, startDate, endDate, startTime, endTime, daysOfWeek) {
    const slots = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (daysOfWeek.includes(dayOfWeek)) {
        slots.push({
          therapist_id: therapistId,
          available_date: currentDate.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (slots.length > 0) {
      return await this.bulkCreate(slots);
    }
    
    return [];
  }
}

module.exports = Availability;