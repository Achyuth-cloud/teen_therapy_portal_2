const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/studentController');
const { studentProfileValidation } = require('../middleware/validation');

router.get('/profile', protect, authorize('student'), getProfile);
router.put('/profile', protect, authorize('student'), studentProfileValidation, updateProfile);

module.exports = router;
