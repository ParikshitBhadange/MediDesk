const adminService = require("../services/admin.service");
const auditService = require("../services/audit.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok } = require("../utils/response");

const stats = asyncHandler(async (req, res) => {
  const data = await adminService.getStats();
  ok(res, data);
});

const staff = asyncHandler(async (req, res) => {
  const data = await adminService.listStaff();
  ok(res, data);
});

const assignRole = asyncHandler(async (req, res) => {
  const user = await adminService.assignRole(req.body.email, req.body.role);
  await auditService.logAction({ userId: req.user.id, action: "ASSIGN_ROLE", entity: "User", entityId: user.id, details: { role: user.role } });
  ok(res, user);
});

const auditLogs = asyncHandler(async (req, res) => {
  const logs = await auditService.listAuditLogs(Number(req.query.limit) || 100);
  ok(res, logs);
});

module.exports = { stats, staff, assignRole, auditLogs };
