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

// Reception re-registers the same real person on a later visit (e.g. a
// follow-up), often under the exact same name + contact number. Without
// this check, createPatient would mint a brand-new Patient row every time,
// and since Consultation/Prescription/Fee/AI-summary all key off patientId,
// the new row would start with a completely empty history even though the
// same person was just seen last week.
//
// We match on contact number (trimmed, exact) rather than name — names can
// have typos/variants, but a phone number is the more reliable identifier
// for "is this the same person". Patients registered without a contact
// number always get a fresh row, since there's nothing reliable to match on.
//
// When a match is found we UPDATE the existing row rather than create a new
// one, so every past consultation/prescription/fee stays attached to it.
// createdAt is intentionally refreshed to "now": the doctor's queue
// (getQueue) and the receptionist's date filter both use Patient.createdAt
// as an IST calendar-day boundary to decide who shows up in "today's"
// list — bumping it is what makes a returning patient reappear in today's
// queue instead of only existing back on their original visit date.
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