const Student = require('../models/Student');

const getProfile = async (req, res) => {
  try {
    const student = await Student.findByUserId(req.user.user_id);

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const student = await Student.findByUserId(req.user.user_id);

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { age, gender, emergencyContact } = req.body;

    await Student.update(student.student_id, {
      age,
      gender,
      emergency_contact: emergencyContact
    });

    const updatedStudent = await Student.findByUserId(req.user.user_id);
    res.json(updatedStudent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
