const Student = require('../models/Student');
const WellbeingResponse = require('../models/WellbeingResponse');

// @desc    Submit wellbeing questionnaire
// @route   POST /api/wellbeing/submit
// @access  Private (Student)
const submitResponse = async (req, res) => {
  const { questionnaireId, responses } = req.body;
  
  try {
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    
    if (!studentId) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    
    // Calculate scores
    let totalScore = 0;
    responses.forEach(response => {
      totalScore += response.answer;
    });
    const averageScore = totalScore / responses.length;
    
    // Save responses
    await WellbeingResponse.create({
      student_id: studentId,
      questionnaire_id: questionnaireId,
      responses,
      total_score: totalScore,
      average_score: averageScore
    });
    
    res.status(201).json({
      message: 'Wellbeing responses submitted successfully',
      averageScore
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student's wellbeing history
// @route   GET /api/wellbeing/history
// @access  Private (Student)
const getWellbeingHistory = async (req, res) => {
  try {
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    const responses = await WellbeingResponse.getStudentHistory(studentId, {
      limit: 100,
      offset: 0
    });
    res.json(responses);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student's latest wellbeing score (for therapist)
// @route   GET /api/wellbeing/student/:studentId
// @access  Private (Therapist)
const getStudentWellbeing = async (req, res) => {
  const { studentId } = req.params;
  
  try {
    const responses = await WellbeingResponse.getStudentHistory(studentId, {
      limit: 5,
      offset: 0
    });
    res.json(responses);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get wellbeing trends
// @route   GET /api/wellbeing/trends
// @access  Private (Student)
const getWellbeingTrends = async (req, res) => {
  try {
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);
    const trends = await WellbeingResponse.getTrends(studentId, 'day');
    res.json(trends);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all questionnaires
// @route   GET /api/wellbeing/questionnaires
// @access  Private
const getQuestionnaires = async (req, res) => {
  try {
    const questionnaires = await WellbeingResponse.getAllQuestionnaires();
    res.json(questionnaires);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get latest wellbeing scores for all students
// @route   GET /api/wellbeing/students/latest
// @access  Private (Therapist)
const getLatestStudentScores = async (req, res) => {
  try {
    const students = await WellbeingResponse.getAllLatestScores();
    res.json(students);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  submitResponse,
  getWellbeingHistory,
  getStudentWellbeing,
  getWellbeingTrends,
  getQuestionnaires,
  getLatestStudentScores
};
