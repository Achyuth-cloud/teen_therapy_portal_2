const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  bookAppointment,
  getStudentAppointments,
  getTherapistAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableSlots
} = require('../controllers/appointmentController');
const { appointmentValidation } = require('../middleware/validation');

router.post('/book', protect, authorize('student'), appointmentValidation, bookAppointment);
router.get('/student', protect, authorize('student'), getStudentAppointments);
router.get('/therapist', protect, authorize('therapist'), getTherapistAppointments);
router.put('/:id/status', protect, authorize('therapist'), updateAppointmentStatus);
router.put('/:id/cancel', protect, authorize('student'), cancelAppointment);
router.get('/available-slots', protect, getAvailableSlots);

module.exports = router;