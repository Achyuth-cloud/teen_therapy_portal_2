const { pool } = require('../config/database');

const normalizeResponses = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return [];
    }
  }

  if (value && typeof value === 'object') {
    return value;
  }

  return [];
};

class WellbeingResponse {
  // Create wellbeing response
  static async create(responseData) {
    const { student_id, questionnaire_id, responses, total_score, average_score } = responseData;
    
    const [result] = await pool.query(
      `INSERT INTO wellbeing_responses (student_id, questionnaire_id, responses, total_score, average_score)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, questionnaire_id, JSON.stringify(responses), total_score, average_score]
    );
    
    return result.insertId;
  }

  // Find response by ID
  static async findById(responseId) {
    const [rows] = await pool.query(
      `SELECT wr.*, wq.title as questionnaire_title,
              u.full_name as student_name
       FROM wellbeing_responses wr
       JOIN wellbeing_questionnaires wq ON wr.questionnaire_id = wq.questionnaire_id
       JOIN students s ON wr.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE wr.response_id = ?`,
      [responseId]
    );
    
    if (rows[0]) {
      rows[0].responses = normalizeResponses(rows[0].responses);
    }
    
    return rows[0];
  }

  // Get student's wellbeing history
  static async getStudentHistory(studentId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    
    const [rows] = await pool.query(
      `SELECT wr.*, wq.title as questionnaire_title
       FROM wellbeing_responses wr
       JOIN wellbeing_questionnaires wq ON wr.questionnaire_id = wq.questionnaire_id
       WHERE wr.student_id = ?
       ORDER BY wr.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [studentId, limit, offset]
    );
    
    // Parse JSON responses
    rows.forEach((row) => {
      row.responses = normalizeResponses(row.responses);
    });
    
    return rows;
  }

  // Get latest wellbeing response
  static async getLatest(studentId) {
    const [rows] = await pool.query(
      `SELECT wr.*, wq.title as questionnaire_title
       FROM wellbeing_responses wr
       JOIN wellbeing_questionnaires wq ON wr.questionnaire_id = wq.questionnaire_id
       WHERE wr.student_id = ?
       ORDER BY wr.submitted_at DESC
       LIMIT 1`,
      [studentId]
    );
    
    if (rows[0]) {
      rows[0].responses = normalizeResponses(rows[0].responses);
    }
    
    return rows[0];
  }

  static async hasCompletedQuestionnaire(studentId, requiredQuestionCount = 10) {
    const latest = await this.getLatest(studentId);

    if (!latest || !Array.isArray(latest.responses)) {
      return false;
    }

    return latest.responses.length >= requiredQuestionCount;
  }

  // Get wellbeing trends
  static async getTrends(studentId, period = 'week') {
    let groupBy;
    switch(period) {
      case 'day':
        groupBy = 'DATE(submitted_at)';
        break;
      case 'week':
        groupBy = 'YEARWEEK(submitted_at)';
        break;
      case 'month':
        groupBy = 'DATE_FORMAT(submitted_at, "%Y-%m")';
        break;
      default:
        groupBy = 'DATE(submitted_at)';
    }
    
    const [rows] = await pool.query(
      `SELECT 
         ${groupBy} as period,
         AVG(average_score) as avg_score,
         MIN(average_score) as min_score,
         MAX(average_score) as max_score,
         COUNT(*) as responses_count
       FROM wellbeing_responses
       WHERE student_id = ?
       GROUP BY period
       ORDER BY period ASC
       LIMIT 12`,
      [studentId]
    );
    
    return rows;
  }

  // Get average wellbeing score for a student
  static async getAverageScore(studentId) {
    const [rows] = await pool.query(
      `SELECT 
         AVG(average_score) as avg_score,
         COUNT(*) as total_responses
       FROM wellbeing_responses
       WHERE student_id = ?`,
      [studentId]
    );
    
    return rows[0];
  }

  // Get all students' latest wellbeing scores (for therapists)
  static async getAllLatestScores() {
    const [rows] = await pool.query(
      `SELECT 
         s.student_id,
         u.full_name as student_name,
         wr.average_score,
         wr.submitted_at as last_response_date
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN wellbeing_responses wr ON s.student_id = wr.student_id
       WHERE wr.submitted_at = (
         SELECT MAX(submitted_at) 
         FROM wellbeing_responses wr2 
         WHERE wr2.student_id = s.student_id
       )
       ORDER BY wr.submitted_at DESC`
    );
    
    return rows;
  }

  // Get students at risk (low wellbeing scores)
  static async getAtRiskStudents(threshold = 2.5) {
    const [rows] = await pool.query(
      `SELECT 
         s.student_id,
         u.full_name,
         u.email,
         wr.average_score,
         wr.submitted_at
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       JOIN wellbeing_responses wr ON s.student_id = wr.student_id
       WHERE wr.submitted_at = (
         SELECT MAX(submitted_at) 
         FROM wellbeing_responses wr2 
         WHERE wr2.student_id = s.student_id
       )
       AND wr.average_score < ?
       ORDER BY wr.average_score ASC`,
      [threshold]
    );
    
    return rows;
  }

  // Delete wellbeing response
  static async delete(responseId) {
    const [result] = await pool.query('DELETE FROM wellbeing_responses WHERE response_id = ?', [responseId]);
    return result.affectedRows > 0;
  }

  // Get wellbeing questionnaire
  static async getQuestionnaire(questionnaireId) {
    const [rows] = await pool.query(
      'SELECT * FROM wellbeing_questionnaires WHERE questionnaire_id = ?',
      [questionnaireId]
    );
    return rows[0];
  }

  // Get all questionnaires
  static async getAllQuestionnaires() {
    const [rows] = await pool.query(
      'SELECT * FROM wellbeing_questionnaires ORDER BY created_at DESC'
    );
    return rows;
  }

  // Create questionnaire (admin only)
  static async createQuestionnaire(title, description) {
    const [result] = await pool.query(
      'INSERT INTO wellbeing_questionnaires (title, description) VALUES (?, ?)',
      [title, description]
    );
    return result.insertId;
  }

  // Get wellbeing statistics
  static async getStats() {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        AVG(average_score) as overall_avg_score,
        COUNT(DISTINCT student_id) as unique_students,
        MIN(average_score) as min_score,
        MAX(average_score) as max_score
      FROM wellbeing_responses
    `);
    return rows[0];
  }

  // Get score distribution
  static async getScoreDistribution() {
    const [rows] = await pool.query(`
      SELECT 
        CASE 
          WHEN average_score >= 4.5 THEN 'Excellent (4.5-5)'
          WHEN average_score >= 3.5 THEN 'Good (3.5-4.4)'
          WHEN average_score >= 2.5 THEN 'Fair (2.5-3.4)'
          WHEN average_score >= 1.5 THEN 'Poor (1.5-2.4)'
          ELSE 'Very Poor (1-1.4)'
        END as category,
        COUNT(*) as count
      FROM wellbeing_responses
      GROUP BY category
      ORDER BY MIN(average_score) DESC
    `);
    return rows;
  }
}

module.exports = WellbeingResponse;
