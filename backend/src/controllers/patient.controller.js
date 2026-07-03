const patientService = require("../services/patient.service");
const auditService = require("../services/audit.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created, noContent } = require("../utils/response");

const list = asyncHandler(async (req, res) => {
  const { conditionLevel, search, date } = req.query;
  const patients = await patientService.listPatients({ conditionLevel, search, date });
  ok(res, patients);
});

const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body, req.user.id);
  await auditService.logAction({ userId: req.user.id, action: "CREATE_PATIENT", entity: "Patient", entityId: patient.id });
  created(res, patient);
});

const update = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  await auditService.logAction({ userId: req.user.id, action: "UPDATE_PATIENT", entity: "Patient", entityId: patient.id });
  ok(res, patient);
});

const remove = asyncHandler(async (req, res) => {
  await patientService.deletePatient(req.params.id);
  await auditService.logAction({ userId: req.user.id, action: "DELETE_PATIENT", entity: "Patient", entityId: req.params.id });
  noContent(res);
});

const doctors = asyncHandler(async (req, res) => {
  const list = await patientService.listDoctors();
  ok(res, list);
});

const collectFee = asyncHandler(async (req, res) => {
  const fee = await patientService.collectFee(req.body, req.user.id);
  await auditService.logAction({ userId: req.user.id, action: "COLLECT_FEE", entity: "Fee", entityId: fee.id });
  created(res, fee);
});

const listFees = asyncHandler(async (req, res) => {
  const fees = await patientService.listFees();
  ok(res, fees);
});

module.exports = { list, create, update, remove, doctors, collectFee, listFees };
