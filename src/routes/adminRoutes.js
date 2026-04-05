const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSystemStats,
  getAllUsers,
  createTherapist,
  deleteUser,
  getAppointmentAnalytics,
  getSystemLogs
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.post('/therapists', createTherapist);
router.delete('/users/:id', deleteUser);
router.get('/analytics/appointments', getAppointmentAnalytics);
router.get('/logs', getSystemLogs);

module.exports = router;