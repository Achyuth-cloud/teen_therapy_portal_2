const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getByAppointment,
  createSessionNote,
  updateSessionNote,
  getStudentSessionNotes
} = require('../controllers/sessionNoteController');

router.get('/appointment/:appointmentId', protect, getByAppointment);
router.get('/student', protect, authorize('student'), getStudentSessionNotes);
router.post('/', protect, authorize('therapist'), createSessionNote);
router.put('/:noteId', protect, authorize('therapist'), updateSessionNote);

module.exports = router;
