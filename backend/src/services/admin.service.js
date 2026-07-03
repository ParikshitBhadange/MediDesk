const { prisma } = require("../config/db");
const { ApiError } = require("../utils/ApiError");

async function getStats() {
  const [patients, doctors, staff, feesAgg] = await Promise.all([
    prisma.patient.count(),
    prisma.user.count({ where: { role: "DOCTOR" } }),
    prisma.user.count(),
    prisma.fee.aggregate({ _sum: { amount: true } }),
  ]);

  return {
    patients,
    doctors,
    staff,
    feesCollected: feesAgg._sum.amount || 0,
  };
}

async function listStaff() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, specialty: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

async function assignRole(email, role) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, "No user with that email — ask them to register first");
  return prisma.user.update({ where: { email }, data: { role }, select: { id: true, name: true, email: true, role: true } });
}

module.exports = { getStats, listStaff, assignRole };
