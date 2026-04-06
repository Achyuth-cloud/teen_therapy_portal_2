const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isFutureAppointment,
  isValidMeetingLink,
  canTransitionAppointmentStatus
} = require('../src/utils/appointmentRules');

test('validates meeting links', () => {
  assert.equal(isValidMeetingLink('https://meet.google.com/abc-defg-hij'), true);
  assert.equal(isValidMeetingLink('https://zoom.us/j/123456789'), true);
  assert.equal(isValidMeetingLink('notaurl'), false);
  assert.equal(isValidMeetingLink('ftp://example.com/meeting'), false);
});

test('validates appointment status transitions', () => {
  assert.equal(canTransitionAppointmentStatus('pending', 'approved'), true);
  assert.equal(canTransitionAppointmentStatus('pending', 'completed'), false);
  assert.equal(canTransitionAppointmentStatus('approved', 'completed'), true);
  assert.equal(canTransitionAppointmentStatus('completed', 'approved'), false);
});

test('validates future appointment times', () => {
  const referenceTime = new Date('2026-04-06T10:00:00');

  assert.equal(isFutureAppointment('2026-04-06', '10:30:00', referenceTime), true);
  assert.equal(isFutureAppointment('2026-04-06', '09:30:00', referenceTime), false);
  assert.equal(isFutureAppointment('2026-04-05', '11:00:00', referenceTime), false);
});
