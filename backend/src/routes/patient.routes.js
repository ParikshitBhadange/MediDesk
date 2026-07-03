const { Router } = require("express");
const patientController = require("../controllers/patient.controller");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validate } = require("../middleware/validate");
const { createPatientSchema, updatePatientSchema, collectFeeSchema } = require("../validations/patient.validation");

const router = Router();

router.use(requireAuth);

router.get("/", patientController.list);
router.get("/doctors", patientController.doctors);
router.post("/", requireRole("RECEPTIONIST", "ADMIN"), validate(createPatientSchema), patientController.create);
router.patch("/:id", requireRole("RECEPTIONIST", "ADMIN", "DOCTOR"), validate(updatePatientSchema), patientController.update);
router.delete("/:id", requireRole("ADMIN"), patientController.remove);

router.get("/fees", patientController.listFees);
router.post("/fees", requireRole("RECEPTIONIST", "ADMIN"), validate(collectFeeSchema), patientController.collectFee);

module.exports = router;
