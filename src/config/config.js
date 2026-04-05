const dotenv = require('dotenv');

dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 9000,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'teen_therapy_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // Rate limiting
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS configuration
  cors: {
    allowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Security configuration
  security: {
    bcryptRounds: 10,
    passwordMinLength: 8,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutes
  },

  // Upload configuration
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    uploadDir: 'uploads/',
  },

  // API configuration
  api: {
    prefix: '/api',
    version: 'v1',
    pagination: {
      defaultLimit: 10,
      maxLimit: 100,
    },
  },

  // Feature flags
  features: {
    enableSMSNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true' || false,
    enableVideoCall: process.env.ENABLE_VIDEO_CALL === 'true' || false,
    enableChat: process.env.ENABLE_CHAT === 'true' || false,
  },

  // Time slots configuration
  timeSlots: {
    duration: 30, // minutes
    startHour: 9, // 9 AM
    endHour: 17, // 5 PM
    breakStart: 12, // 12 PM
    breakEnd: 13, // 1 PM
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  },

  // Wellbeing questionnaire configuration
  wellbeing: {
    minAge: 13,
    maxAge: 19,
    questions: [
      { id: 1, text: "How would you rate your overall mood today?" },
      { id: 2, text: "Have you been feeling anxious or worried recently?" },
      { id: 3, text: "How well have you been sleeping?" },
      { id: 4, text: "How connected do you feel to others?" },
      { id: 5, text: "How would you rate your stress levels?" },
    ],
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    directory: 'logs/',
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = ['database.host', 'database.user', 'database.name'];
  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (!value) return true;
    }
    return false;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  // Warn about default JWT secret in production
  if (config.server.env === 'production' && config.jwt.secret === 'your-secret-key-change-this') {
    console.warn('WARNING: Using default JWT secret in production. This is insecure!');
  }
};

// Validate only in production
if (config.server.env === 'production') {
  validateConfig();
}

module.exports = config;
