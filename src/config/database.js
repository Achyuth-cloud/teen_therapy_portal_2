const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
const initDatabase = async () => {
  const connection = await pool.getConnection();
  
  try {
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.query(`USE ${process.env.DB_NAME}`);
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'therapist', 'admin') DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      )
    `);
    
    // Create students table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        student_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNIQUE NOT NULL,
        age INT CHECK (age BETWEEN 13 AND 19),
        gender VARCHAR(20),
        emergency_contact VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);
    
    // Create therapists table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS therapists (
        therapist_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNIQUE NOT NULL,
        specialization VARCHAR(150),
        experience_years INT DEFAULT 0,
        bio TEXT,
        license_number VARCHAR(100),
        consultation_fee DECIMAL(10, 2),
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_available (is_available)
      )
    `);
    
    // Create availability table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS availability (
        availability_id INT PRIMARY KEY AUTO_INCREMENT,
        therapist_id INT NOT NULL,
        available_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_booked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id) ON DELETE CASCADE,
        INDEX idx_therapist_date (therapist_id, available_date),
        INDEX idx_is_booked (is_booked)
      )
    `);
    
    // Create appointments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        therapist_id INT NOT NULL,
        availability_id INT,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
        meeting_link VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id) ON DELETE CASCADE,
        FOREIGN KEY (availability_id) REFERENCES availability(availability_id) ON DELETE SET NULL,
        INDEX idx_student (student_id),
        INDEX idx_therapist (therapist_id),
        INDEX idx_status (status),
        INDEX idx_date (appointment_date)
      )
    `);
    
    // Create wellbeing_questionnaires table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wellbeing_questionnaires (
        questionnaire_id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create wellbeing_responses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wellbeing_responses (
        response_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        questionnaire_id INT NOT NULL,
        responses JSON NOT NULL,
        total_score INT,
        average_score DECIMAL(3, 2),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (questionnaire_id) REFERENCES wellbeing_questionnaires(questionnaire_id) ON DELETE CASCADE,
        INDEX idx_student (student_id),
        INDEX idx_submitted_at (submitted_at)
      )
    `);
    
    // Create session_notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session_notes (
        note_id INT PRIMARY KEY AUTO_INCREMENT,
        appointment_id INT UNIQUE NOT NULL,
        therapist_id INT NOT NULL,
        notes TEXT NOT NULL,
        recommendations TEXT,
        next_session_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
        FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id) ON DELETE CASCADE,
        INDEX idx_appointment (appointment_id),
        INDEX idx_therapist (therapist_id)
      )
    `);
    
    // Create resources table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS resources (
        resource_id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('article', 'video', 'helpline', 'exercise') NOT NULL,
        link VARCHAR(255),
        content TEXT,
        created_by INT,
        is_active BOOLEAN DEFAULT TRUE,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_type (type),
        INDEX idx_is_active (is_active)
      )
    `);
    
    // Create notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('appointment', 'reminder', 'system', 'message') DEFAULT 'system',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // Create system_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        log_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('Database tables created successfully');
    
    // Insert default data
    await insertDefaultData(connection);
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    connection.release();
  }
};

const insertDefaultData = async (connection) => {
  try {
    // Check if admin exists
    const [adminExists] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      ['admin@therapyportal.com']
    );
    
    if (adminExists.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      // Create admin user
      await connection.query(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        ['System Admin', 'admin@therapyportal.com', hashedPassword, 'admin']
      );
      
      console.log('Default admin user created');
    }
    
    // Check if sample questionnaire exists
    const [questionnaireExists] = await connection.query(
      'SELECT * FROM wellbeing_questionnaires LIMIT 1'
    );
    
    if (questionnaireExists.length === 0) {
      await connection.query(
        'INSERT INTO wellbeing_questionnaires (title, description) VALUES (?, ?)',
        ['Weekly Wellbeing Check-in', 'Standard questionnaire to assess student mental wellbeing']
      );
      console.log('Sample questionnaire created');
    }
    
  } catch (error) {
    console.error('Error inserting default data:', error);
  }
};

if (require.main === module) {
  (async () => {
    const connected = await testConnection();

    if (!connected) {
      process.exit(1);
    }

    await initDatabase();
    await pool.end();
  })().catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
}

module.exports = { pool, testConnection, initDatabase };
