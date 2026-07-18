const { prisma } = require("../config/db");
const { ApiError } = require("../utils/ApiError");
const { getDayRange } = require("../utils/dateRange");

// Doctor's queue: only patients routed to them TODAY (IST calendar day) AND
// explicitly ticked "sent to doctor" by reception (queuedAt is set). Without
// the day filter, every patient ever assigned to this doctor would resurface
// forever; without the queuedAt filter, patients would show up the instant
// they're registered instead of when reception actually sends them in.
//
// Ordered by queuedAt (not createdAt) so the queue is First In First Out
// based on when each patient was ticked into the queue — a patient
// registered earlier but ticked later falls behind one registered later
// but ticked first.
async function getQueue(doctorId) {
  const { start, end } = getDayRange();
  return prisma.patient.findMany({
    where: { doctorId, queuedAt: { not: null }, createdAt: { gte: start, lt: end } },
    orderBy: { queuedAt: "asc" },
    select: { id: true, name: true, contact: true, description: true, conditionLevel: true, createdAt: true, queuedAt: true },
  });
}

async function getOrCreateTodayConsultation(patientId, doctorId, role) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ApiError(404, "Patient not found");
  if (role !== "ADMIN" && patient.doctorId !== doctorId) {
    throw new ApiError(403, "This patient is not assigned to you");
  }

  const { start, end } = getDayRange();

  const existing = await prisma.consultation.findFirst({
    where: { patientId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.consultation.create({ data: { patientId, doctorId } });
}

async function updateConsultation(id, data) {
  const consultation = await prisma.consultation.findUnique({ where: { id } });
  if (!consultation) throw new ApiError(404, "Consultation not found");
  return prisma.consultation.update({ where: { id }, data });
}

async function getPrescriptionItems(consultationId) {
  const prescription = await prisma.prescription.findFirst({ where: { consultationId } });
  if (!prescription) return [];
  return prisma.prescriptionItem.findMany({
    where: { prescriptionId: prescription.id },
    orderBy: { sequence: "asc" },
  });
}

async function addPrescriptionItem(consultationId, patientId, doctorId, item) {
  let prescription = await prisma.prescription.findFirst({ where: { consultationId } });
  if (!prescription) {
    prescription = await prisma.prescription.create({
      data: { consultationId, patientId, doctorId },
    });
  }

  const count = await prisma.prescriptionItem.count({ where: { prescriptionId: prescription.id } });
  const { medicine, dosage, frequency, duration, instructions } = item;

  return prisma.prescriptionItem.create({
    data: { prescriptionId: prescription.id, sequence: count + 1, medicine, dosage, frequency, duration, instructions },
  });
}

async function removePrescriptionItem(id) {
  const item = await prisma.prescriptionItem.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "Prescription item not found");
  await prisma.prescriptionItem.delete({ where: { id } });
}

function treatedByCondition(doctorId, role) {
  if (role === "ADMIN") return {};
  return { OR: [{ doctorId }, { consultations: { some: { doctorId } } }] };
}

async function getPreviousConsultations(patientId, doctorId, role) {
  if (role !== "ADMIN") {
    const treated = await prisma.patient.findFirst({
      where: { id: patientId, ...treatedByCondition(doctorId, role) },
      select: { id: true },
    });
    if (!treated) throw new ApiError(403, "You have not treated this patient");
  }

  return prisma.consultation.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: {
      prescriptions: {
        include: {
          items: {
            select: { medicine: true, dosage: true, frequency: true, duration: true, instructions: true, sequence: true },
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });
}

async function searchMyPatients(doctorId, query, role) {
  const q = (query || "").trim();
  const digits = q.replace(/\D/g, "");
  const consultationFilter = role === "ADMIN" ? {} : { doctorId };

  const where = { ...treatedByCondition(doctorId, role) };
  if (q) {
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ contact: { contains: digits } }] : []),
          { consultations: { some: { ...consultationFilter, disease: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ];
  }

  return prisma.patient.findMany({
    where,
    orderBy: { name: "asc" },
    take: 50,
    select: {
      id: true,
      name: true,
      contact: true,
      conditionLevel: true,
      createdAt: true,
      consultations: {
        where: consultationFilter,
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { disease: true, createdAt: true },
      },
    },
  });
}

async function getPatientForDoctor(patientId, doctorId, role) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, ...treatedByCondition(doctorId, role) },
    select: { id: true, name: true, contact: true, description: true, conditionLevel: true, createdAt: true },
  });
  if (!patient) throw new ApiError(404, "Patient not found");
  return patient;
}

async function updatePatientBasics(patientId, data) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ApiError(404, "Patient not found");
  return prisma.patient.update({ where: { id: patientId }, data });
}

async function listDoctorMeetings(doctorId) {
  return prisma.meeting.findMany({
    where: { doctorId },
    orderBy: { scheduledAt: "asc" },
    include: { patient: { select: { name: true } } },
  });
}

async function scheduleMeeting({ patientId, doctorId, title, scheduledAt, consultationId }) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ApiError(404, "Patient not found");
  if (!scheduledAt) throw new ApiError(400, "scheduledAt is required");

  return prisma.meeting.create({
    data: { patientId, doctorId, title: title || "Follow-up", scheduledAt: new Date(scheduledAt), consultationId },
  });
}

async function updateMeetingStatus(id, status) {
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) throw new ApiError(404, "Meeting not found");
  return prisma.meeting.update({ where: { id }, data: { status } });
}

module.exports = {
  getQueue,
  getOrCreateTodayConsultation,
  updateConsultation,
  getPrescriptionItems,
  addPrescriptionItem,
  removePrescriptionItem,
  getPreviousConsultations,
  searchMyPatients,
  getPatientForDoctor,
  updatePatientBasics,
  listDoctorMeetings,
  scheduleMeeting,
  updateMeetingStatus,
};