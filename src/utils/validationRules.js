const validationRules = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-z]).{8,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  date: /^\d{4}-\d{2}-\d{2}$/
};

const validateEmail = (email) => validationRules.email.test(email);
const validatePassword = (password) => validationRules.password.test(password);
const validateTime = (time) => validationRules.time.test(time);
const validateDate = (date) => validationRules.date.test(date);

module.exports = {
  validationRules,
  validateEmail,
  validatePassword,
  validateTime,
  validateDate
};