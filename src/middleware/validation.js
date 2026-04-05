const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/).withMessage('Password must contain at least one uppercase letter and one number'),
  body('age').isInt({ min: 13, max: 19 }).withMessage('Age must be between 13 and 19'),
  body('gender').optional().isString(),
  validate
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const appointmentValidation = [
  body('therapistId').isInt().withMessage('Valid therapist ID is required'),
  body('appointmentDate').isDate().withMessage('Valid date is required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required'),
  body('reason').optional().isString().isLength({ max: 500 }),
  validate
];

const wellbeingResponseValidation = [
  body('responses').isArray().withMessage('Responses must be an array'),
  body('responses.*.questionId').isInt(),
  body('responses.*.answer').isInt({ min: 1, max: 5 }),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  appointmentValidation,
  wellbeingResponseValidation
};