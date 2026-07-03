// Meetings/appointments are exposed under /api/doctor/meetings for doctors.
// This module is kept for a future receptionist-facing appointment view
// (e.g. hospital-wide calendar) without disturbing the doctor routes above.
const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok } = require("../utils/response");

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const meetings = await prisma.meeting.findMany({
      orderBy: { scheduledAt: "asc" },
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } },
    });
    ok(res, meetings);
  }),
);

module.exports = router;
