const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const User = require('../models/User');
const Therapist = require('../models/Therapist');
const Appointment = require('../models/Appointment');

// @desc    Get system stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getSystemStats = async (req, res) => {
  try {
    const stats = await User.getSystemStats();
    res.json(stats);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  const { role, search } = req.query;
  
  try {
    const users = await User.findAll({ role, search });
    res.json(users);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create therapist account
// @route   POST /api/admin/therapists
// @access  Private (Admin)
const createTherapist = async (req, res) => {
  const { fullName, email, password, specialization, experience_years, bio, license_number } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if user exists
    const existingUser = await User.findByEmail(email, connection);

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create(
      { full_name: fullName, email, password: hashedPassword, role: 'therapist', hashPassword: false },
      connection
    );
    
    await Therapist.create(
      {
        user_id: user.user_id,
        specialization,
        experience_years,
        bio,
        license_number
      },
      connection
    );
    
    await connection.commit();
    
    res.status(201).json({ message: 'Therapist created successfully' });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    await User.delete(id);
    res.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get appointment analytics
// @route   GET /api/admin/analytics/appointments
// @access  Private (Admin)
const getAppointmentAnalytics = async (req, res) => {
  const { period } = req.query; // daily, weekly, monthly
  
  try {
    const analytics = await Appointment.getAnalytics(period);
    res.json(analytics);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private (Admin)
const getSystemLogs = async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  try {
    const result = await User.getSystemLogs({ limit, offset });
    res.json(result);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  createTherapist,
  deleteUser,
  getAppointmentAnalytics,
  getSystemLogs
};
