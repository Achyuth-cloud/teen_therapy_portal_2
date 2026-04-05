const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllTherapists,
  getTherapistById,
  setAvailability,
  getAvailability,
  deleteAvailability,
  updateProfile,
  getStats
} = require('../controllers/therapistController');

router.get('/', protect, getAllTherapists);
router.get('/stats', protect, authorize('therapist'), getStats);
router.get('/availability', protect, getAvailability);
router.post('/availability', protect, authorize('therapist'), setAvailability);
router.delete('/availability/:id', protect, authorize('therapist'), deleteAvailability);
router.put('/profile', protect, authorize('therapist'), updateProfile);
router.get('/:id', protect, getTherapistById);

module.exports = router;
