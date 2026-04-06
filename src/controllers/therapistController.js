const Therapist = require('../models/Therapist');

// @desc    Get all therapists
// @route   GET /api/therapists
// @access  Private
const getAllTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.findAll({ available: true });
    res.json(therapists);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get therapist by ID
// @route   GET /api/therapists/:id
// @access  Private
const getTherapistById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const therapist = await Therapist.findById(id);

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }
    
    res.json(therapist);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Set therapist availability
// @route   POST /api/therapists/availability
// @access  Private (Therapist)
const setAvailability = async (req, res) => {
  const { availableDate, startTime, endTime } = req.body;
  
  try {
    if (!availableDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be later than start time' });
    }

    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    
    if (!therapistId) {
      return res.status(404).json({ message: 'Therapist profile not found' });
    }
    
    // Check if slot already exists
    const existing = await Therapist.hasAvailabilitySlot(therapistId, availableDate, startTime);

    if (existing) {
      return res.status(400).json({ message: 'Time slot already exists' });
    }
    
    await Therapist.addAvailability(therapistId, availableDate, startTime, endTime);
    
    res.status(201).json({ message: 'Availability added successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get therapist availability
// @route   GET /api/therapists/availability
// @access  Private
const getAvailability = async (req, res) => {
  const { therapistId: therapistIdParam, startDate, endDate } = req.query;
  
  try {
    let therapistId = therapistIdParam;

    if (!therapistId && req.user.role === 'therapist') {
      therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    }

    if (!therapistId) {
      return res.status(400).json({ message: 'Therapist ID is required' });
    }

    const availability = await Therapist.getAvailability(therapistId, startDate, endDate);
    res.json(availability);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete availability slot
// @route   DELETE /api/therapists/availability/:id
// @access  Private (Therapist)
const deleteAvailability = async (req, res) => {
  const { id } = req.params;
  
  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    await Therapist.removeAvailability(id, therapistId);
    res.json({ message: 'Availability deleted successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update therapist profile
// @route   PUT /api/therapists/profile
// @access  Private (Therapist)
const updateProfile = async (req, res) => {
  const { specialization, experience_years, bio, consultation_fee } = req.body;
  
  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    await Therapist.update(therapistId, {
      specialization,
      experience_years,
      bio,
      consultation_fee
    });
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get therapist stats
// @route   GET /api/therapists/stats
// @access  Private (Therapist)
const getStats = async (req, res) => {
  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    const stats = await Therapist.getStats(therapistId);
    res.json(stats);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllTherapists,
  getTherapistById,
  setAvailability,
  getAvailability,
  deleteAvailability,
  updateProfile,
  getStats
};
