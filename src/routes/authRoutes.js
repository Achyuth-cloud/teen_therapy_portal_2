const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation, profileValidation } = require('../middleware/validation');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, profileValidation, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
