const { prisma } = require("../config/db");

async function logAction({ userId, action, entity, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details: details ?? undefined },
    });
  } catch (err) {
    // Auditing must never break the primary request.
    console.error("Failed to write audit log:", err);
  }
}

async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
}

module.exports = { logAction, listAuditLogs };
