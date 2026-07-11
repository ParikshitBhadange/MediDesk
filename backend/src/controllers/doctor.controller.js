const doctorService = require("../services/doctor.service");
const aiService = require("../services/ai.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created, noContent } = require("../utils/response");

const queue = asyncHandler(async (req, res) => {
  const patients = await doctorService.getQueue(req.user.id);
  ok(res, patients);
});

const getOrCreateConsultation = asyncHandler(async (req, res) => {
  const consultation = await doctorService.getOrCreateTodayConsultation(req.params.patientId, req.user.id, req.user.role);
  ok(res, consultation);
});

const updateConsultation = asyncHandler(async (req, res) => {
  const consultation = await doctorService.updateConsultation(req.params.id, req.body);
  ok(res, consultation);
});

const prescriptionItems = asyncHandler(async (req, res) => {
  const items = await doctorService.getPrescriptionItems(req.params.consultationId);
  ok(res, items);
});

const addPrescriptionItem = asyncHandler(async (req, res) => {
  const { patientId } = req.body;
  const item = await doctorService.addPrescriptionItem(req.params.consultationId, patientId, req.user.id, req.body);
  created(res, item);
});

const removePrescriptionItem = asyncHandler(async (req, res) => {
  await doctorService.removePrescriptionItem(req.params.id);
  noContent(res);
});

const previousConsultations = asyncHandler(async (req, res) => {
  const data = await doctorService.getPreviousConsultations(req.params.patientId, req.user.id, req.user.role);
  ok(res, data);
});

const searchPatients = asyncHandler(async (req, res) => {
  const data = await doctorService.searchMyPatients(req.user.id, req.query.query, req.user.role);
  ok(res, data);
});

const patientDetail = asyncHandler(async (req, res) => {
  const data = await doctorService.getPatientForDoctor(req.params.patientId, req.user.id, req.user.role);
  ok(res, data);
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await doctorService.updatePatientBasics(req.params.patientId, req.body);
  ok(res, patient);
});

const meetings = asyncHandler(async (req, res) => {
  const data = await doctorService.listDoctorMeetings(req.user.id);
  ok(res, data);
});

const scheduleMeeting = asyncHandler(async (req, res) => {
  const meeting = await doctorService.scheduleMeeting({ ...req.body, doctorId: req.user.id });
  created(res, meeting);
});

const updateMeetingStatus = asyncHandler(async (req, res) => {
  const meeting = await doctorService.updateMeetingStatus(req.params.id, req.body.status);
  ok(res, meeting);
});

const analyse = asyncHandler(async (req, res) => {
  const suggestion = await aiService.analysePrescription(req.body);
  ok(res, { suggestion });
});

module.exports = {
  queue,
  getOrCreateConsultation,
  updateConsultation,
  prescriptionItems,
  addPrescriptionItem,
  removePrescriptionItem,
  previousConsultations,
  searchPatients,
  patientDetail,
  updatePatient,
  meetings,
  scheduleMeeting,
  updateMeetingStatus,
  analyse,
};