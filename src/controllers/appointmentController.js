const { pool } = require('../config/database');
const Student = require('../models/Student');
const Therapist = require('../models/Therapist');
const Appointment = require('../models/Appointment');

// @desc    Book appointment
// @route   POST /api/appointments/book
// @access  Private (Student)
const bookAppointment = async (req, res) => {
  const { therapistId, appointmentDate, appointmentTime, reason } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    
    if (!studentId) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    
    // Check if therapist exists and is available
    const therapist = await Therapist.findAvailableById(therapistId, connection);

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not available' });
    }
    
    // Check for conflicting appointments
    const hasConflict = await Appointment.checkConflict(
      therapistId,
      appointmentDate,
      appointmentTime,
      null,
      connection
    );

    if (hasConflict) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }
    
    // Create appointment
    const appointmentId = await Appointment.create(
      {
        student_id: studentId,
        therapist_id: therapistId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason,
        status: 'pending'
      },
      connection
    );
    
    // Create notification for therapist
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'appointment')`,
      [therapist.user_id, 'New Appointment Request', `A new appointment request has been made for ${appointmentDate} at ${appointmentTime}`]
    );
    
    await connection.commit();

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Get student appointments
// @route   GET /api/appointments/student
// @access  Private (Student)
const getStudentAppointments = async (req, res) => {
  try {
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    
    if (!studentId) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    
    const appointments = await Appointment.getStudentAppointments(studentId);
    res.json(appointments);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get therapist appointments
// @route   GET /api/appointments/therapist
// @access  Private (Therapist)
const getTherapistAppointments = async (req, res) => {
  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    
    if (!therapistId) {
      return res.status(404).json({ message: 'Therapist profile not found' });
    }
    
    const appointments = await Appointment.getTherapistAppointments(therapistId);
    res.json(appointments);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Therapist)
const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, meetingLink } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    
    // Get appointment details
    const appointment = await Appointment.findForTherapistAction(id, therapistId, connection);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Update status
    await Appointment.updateStatus(id, status, meetingLink || null, connection);
    
    // Create notification for student
    let message = '';
    if (status === 'approved') {
      message = `Your appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been approved.`;
    } else if (status === 'rejected') {
      message = `Your appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been rejected.`;
    } else if (status === 'completed') {
      message = `Your appointment for ${appointment.appointment_date} has been marked as completed.`;
    }
    
    if (message) {
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, 'appointment')`,
        [appointment.user_id, 'Appointment Update', message]
      );
    }
    
    await connection.commit();
    
    res.json({ message: 'Appointment status updated successfully' });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private (Student)
const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    
    const appointment = await Appointment.findForStudentCancellation(id, studentId, connection);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or cannot be cancelled' });
    }

    await Appointment.cancel(id, connection);
    
    // Notify therapist
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'appointment')`,
      [appointment.user_id, 'Appointment Cancelled', `An appointment for ${appointment.appointment_date} has been cancelled by the student.`]
    );
    
    await connection.commit();
    
    res.json({ message: 'Appointment cancelled successfully' });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Get available time slots
// @route   GET /api/appointments/available-slots
// @access  Private
const getAvailableSlots = async (req, res) => {
  const { therapistId, date } = req.query;
  
  try {
    const [bookedSlots] = await pool.query(
      `SELECT appointment_time 
       FROM appointments 
       WHERE therapist_id = ? 
       AND appointment_date = ? 
       AND status IN ('pending', 'approved')`,
      [therapistId, date]
    );
    
    const bookedTimes = bookedSlots.map((slot) => String(slot.appointment_time).slice(0, 5));
    
    // Get therapist availability for the date
    const [availability] = await pool.query(
      `SELECT start_time, end_time 
       FROM availability 
       WHERE therapist_id = ? 
       AND available_date = ? 
       AND is_booked = FALSE`,
      [therapistId, date]
    );
    
    // Generate time slots (30-minute intervals)
    const timeSlots = [];
    for (const avail of availability) {
      let start = new Date(`1970-01-01T${avail.start_time}`);
      const end = new Date(`1970-01-01T${avail.end_time}`);
      
      while (start < end) {
        const timeString = start.toTimeString().slice(0, 5);
        if (!bookedTimes.includes(timeString)) {
          timeSlots.push(timeString);
        }
        start.setMinutes(start.getMinutes() + 30);
      }
    }
    
    res.json(timeSlots);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  bookAppointment,
  getStudentAppointments,
  getTherapistAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableSlots
};
