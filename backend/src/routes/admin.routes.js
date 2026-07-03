const { Router } = require("express");
const adminController = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", adminController.stats);
router.get("/staff", adminController.staff);
router.post("/assign-role", adminController.assignRole);
router.get("/audit-logs", adminController.auditLogs);

module.exports = router;
