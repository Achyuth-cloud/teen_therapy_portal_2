const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const User = require('../models/User');
const Student = require('../models/Student');
const Therapist = require('../models/Therapist');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { fullName, email, password, age, gender } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if user exists
    const existingUser = await User.findByEmail(email, connection);

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create(
      { full_name: fullName, email, password: hashedPassword, role: 'student', hashPassword: false },
      connection
    );

    await Student.create(
      { user_id: user.user_id, age, gender },
      connection
    );
    
    await connection.commit();

    // Generate token
    const token = generateToken(user.user_id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.user_id,
        name: fullName,
        email,
        role: 'student'
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Get user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findByUserId(user.user_id);
    } else if (user.role === 'therapist') {
      roleData = await Therapist.findByUserId(user.user_id);
    }
    
    // Generate token
    const token = generateToken(user.user_id);
    
    // Log login activity
    await User.logAction({ user_id: user.user_id, action: 'LOGIN', ip_address: req.ip });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        roleData
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findByUserId(user.user_id);
    } else if (user.role === 'therapist') {
      roleData = await Therapist.findByUserId(user.user_id);
    }
    
    res.json({
      ...user,
      roleData
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    // Get user with password
    const user = await User.findByIdWithPassword(req.user.user_id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await User.updatePassword(req.user.user_id, hashedPassword);
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, changePassword };
