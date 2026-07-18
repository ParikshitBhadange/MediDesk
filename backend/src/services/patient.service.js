const { prisma } = require("../config/db");
const { ApiError } = require("../utils/ApiError");
const { getDayRange } = require("../utils/dateRange");

const DOCTOR_SELECT = { select: { id: true, name: true, specialty: true } };

async function listPatients({ conditionLevel, search, date }) {
  const where = {};
  if (conditionLevel && conditionLevel !== "all") where.conditionLevel = conditionLevel;
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (date) {
    const { start, end } = getDayRange(date);
    where.createdAt = { gte: start, lt: end };
  }

  return prisma.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignedDoctor: DOCTOR_SELECT },
  });
}

async function createPatient(data, createdById) {
  const contact = data.contact?.trim() || null;

  if (contact) {
    const existing = await prisma.patient.findFirst({ where: { contact } });
    if (existing) {
      return prisma.patient.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          description: data.description || null,
          conditionLevel: data.conditionLevel,
          doctorId: data.doctorId || null,
          createdById,
          createdAt: new Date(),
        },
        include: { assignedDoctor: DOCTOR_SELECT },
      });
    }
  }

  return prisma.patient.create({
    data: {
      name: data.name,
      contact,
      description: data.description || null,
      conditionLevel: data.conditionLevel,
      doctorId: data.doctorId || null,
      createdById,
    },
    include: { assignedDoctor: DOCTOR_SELECT },
  });
}

async function updatePatient(id, data) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new ApiError(404, "Patient not found");

  return prisma.patient.update({
    where: { id },
    data,
    include: { assignedDoctor: DOCTOR_SELECT },
  });
}

// Ticking the "sent to doctor" checkbox stamps queuedAt with the current
// time; unticking clears it back to null. Doctor.getQueue orders by this
// timestamp, so whoever gets ticked first is seen first (FIFO) — not
// whoever was registered first.
async function setQueueStatus(id, queued) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new ApiError(404, "Patient not found");

  return prisma.patient.update({
    where: { id },
    data: { queuedAt: queued ? new Date() : null },
    include: { assignedDoctor: DOCTOR_SELECT },
  });
}

async function deletePatient(id) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new ApiError(404, "Patient not found");
  await prisma.patient.delete({ where: { id } });
}

async function listDoctors() {
  return prisma.user.findMany({
    where: { role: "DOCTOR" },
    select: { id: true, name: true, email: true, specialty: true },
    orderBy: { name: "asc" },
  });
}

async function collectFee(data, collectedById) {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new ApiError(404, "Patient not found");

  return prisma.fee.create({
    data: {
      patientId: data.patientId,
      amount: data.amount,
      method: data.method,
      description: data.description || null,
      collectedById,
    },
    include: { patient: { select: { name: true } } },
  });
}

async function listFees() {
  return prisma.fee.findMany({
    orderBy: { createdAt: "desc" },
    include: { patient: { select: { name: true } } },
  });
}

module.exports = {
  listPatients,
  createPatient,
  updatePatient,
  setQueueStatus,
  deletePatient,
  listDoctors,
  collectFee,
  listFees,
};