const SessionNote = require('../models/SessionNote');
const Appointment = require('../models/Appointment');
const Therapist = require('../models/Therapist');
const Student = require('../models/Student');

const getByAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const note = await SessionNote.findByAppointmentId(appointmentId);

    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSessionNote = async (req, res) => {
  const { appointmentId, notes, recommendations, nextSessionDate } = req.body;

  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);

    if (!therapistId) {
      return res.status(404).json({ message: 'Therapist profile not found' });
    }

    const appointment = await Appointment.findForTherapistAction(appointmentId, therapistId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const existing = await SessionNote.findByAppointmentId(appointmentId);

    if (existing) {
      return res.status(400).json({ message: 'Session note already exists for this appointment' });
    }

    const noteId = await SessionNote.create({
      appointment_id: appointmentId,
      therapist_id: therapistId,
      notes,
      recommendations,
      next_session_date: nextSessionDate || null
    });

    await Appointment.updateStatus(appointmentId, 'completed');

    res.status(201).json({ message: 'Session note created successfully', noteId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSessionNote = async (req, res) => {
  const { noteId } = req.params;
  const { notes, recommendations, nextSessionDate } = req.body;

  try {
    const therapistId = await Therapist.getTherapistIdByUserId(req.user.user_id);
    const note = await SessionNote.findById(noteId);

    if (!note || note.therapist_id !== therapistId) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    await SessionNote.update(noteId, {
      notes,
      recommendations,
      next_session_date: nextSessionDate || null
    });

    res.json({ message: 'Session note updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStudentSessionNotes = async (req, res) => {
  try {
    const studentId = await Student.getStudentIdByUserId(req.user.user_id);

    if (!studentId) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const notes = await SessionNote.getStudentNotes(studentId, { limit: 100, offset: 0 });
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getByAppointment,
  createSessionNote,
  updateSessionNote,
  getStudentSessionNotes
};
