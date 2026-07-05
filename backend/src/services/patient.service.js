const { prisma } = require("../config/db");
const { ApiError } = require("../utils/ApiError");
const { getDayRange } = require("../utils/dateRange");

const DOCTOR_SELECT = { select: { id: true, name: true, specialty: true } };

async function listPatients({ conditionLevel, search, date }) {
  const where = {};
  if (conditionLevel && conditionLevel !== "all") where.conditionLevel = conditionLevel;
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (date) {
    // date is a "YYYY-MM-DD" string from the receptionist's date picker —
    // getDayRange interprets that as an IST calendar day (fixed offset),
    // not the server's own OS timezone, so filtering doesn't silently shift
    // by several hours depending on where this happens to be deployed.
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
  return prisma.patient.create({
    data: {
      name: data.name,
      contact: data.contact || null,
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

module.exports = { listPatients, createPatient, updatePatient, deletePatient, listDoctors, collectFee, listFees };