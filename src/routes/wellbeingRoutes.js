const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  submitResponse,
  getWellbeingHistory,
  getStudentWellbeing,
  getWellbeingTrends,
  getQuestionnaires,
  getLatestStudentScores
} = require('../controllers/wellbeingController');
const { wellbeingResponseValidation } = require('../middleware/validation');

router.post('/submit', protect, authorize('student'), wellbeingResponseValidation, submitResponse);
router.get('/history', protect, authorize('student'), getWellbeingHistory);
router.get('/trends', protect, authorize('student'), getWellbeingTrends);
router.get('/questionnaires', protect, getQuestionnaires);
router.get('/students/latest', protect, authorize('therapist'), getLatestStudentScores);
router.get('/student/:studentId', protect, authorize('therapist'), getStudentWellbeing);

module.exports = router;
