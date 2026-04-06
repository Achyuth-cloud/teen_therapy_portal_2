const VALID_MEETING_PROTOCOLS = new Set(['https:', 'http:']);

const parseAppointmentDateTime = (appointmentDate, appointmentTime) => {
  if (!appointmentDate || !appointmentTime) {
    return null;
  }

  const normalizedDate = String(appointmentDate).slice(0, 10);
  const normalizedTime = String(appointmentTime).slice(0, 8);
  const value = new Date(`${normalizedDate}T${normalizedTime}`);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
};

const isFutureAppointment = (appointmentDate, appointmentTime, now = new Date()) => {
  const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime);

  if (!appointmentDateTime) {
    return false;
  }

  return appointmentDateTime.getTime() > now.getTime();
};

const isPastAppointment = (appointmentDate, appointmentTime, now = new Date()) => {
  const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime);

  if (!appointmentDateTime) {
    return false;
  }

  return appointmentDateTime.getTime() < now.getTime();
};

const isValidMeetingLink = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return VALID_MEETING_PROTOCOLS.has(url.protocol) && url.hostname.length > 0;
  } catch (error) {
    return false;
  }
};

const canTransitionAppointmentStatus = (currentStatus, nextStatus) => {
  const allowedTransitions = {
    pending: new Set(['approved', 'rejected']),
    approved: new Set(['completed']),
    rejected: new Set(),
    completed: new Set(),
    cancelled: new Set()
  };

  return allowedTransitions[currentStatus]?.has(nextStatus) || false;
};

module.exports = {
  parseAppointmentDateTime,
  isFutureAppointment,
  isPastAppointment,
  isValidMeetingLink,
  canTransitionAppointmentStatus
};
