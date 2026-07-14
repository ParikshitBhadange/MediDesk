const { Router } = require("express");
const doctorController = require("../controllers/doctor.controller");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validate } = require("../middleware/validate");
const {
  updateConsultationSchema,
  addPrescriptionItemSchema,
  updatePatientByDoctorSchema,
  analyseSchema,
} = require("../validations/doctor.validation");

const router = Router();

router.use(requireAuth, requireRole("DOCTOR", "ADMIN"));

router.get("/queue", doctorController.queue);
router.get("/patients/search", doctorController.searchPatients);
router.get("/patients/:patientId/consultation", doctorController.getOrCreateConsultation);
router.get("/patients/:patientId/consultations", doctorController.previousConsultations);
router.get("/patients/:patientId/profile", doctorController.patientDetail);
router.get("/patients/:patientId/ai-summary", doctorController.aiSummary);
router.patch("/patients/:patientId", validate(updatePatientByDoctorSchema), doctorController.updatePatient);

router.patch("/consultations/:id", validate(updateConsultationSchema), doctorController.updateConsultation);

router.get("/consultations/:consultationId/items", doctorController.prescriptionItems);
router.post("/consultations/:consultationId/items", validate(addPrescriptionItemSchema), doctorController.addPrescriptionItem);
router.delete("/items/:id", doctorController.removePrescriptionItem);

router.get("/meetings", doctorController.meetings);
router.post("/meetings", doctorController.scheduleMeeting);
router.patch("/meetings/:id/status", doctorController.updateMeetingStatus);

router.post("/analyse", validate(analyseSchema), doctorController.analyse);

module.exports = router;