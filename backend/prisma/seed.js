const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/hashPassword");

const prisma = new PrismaClient();

async function main() {
  const password = await hashPassword("Password123!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@medidesk.com" },
    update: {},
    create: { name: "System Admin", email: "admin@medidesk.com", password, role: "ADMIN" },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@medidesk.com" },
    update: {},
    create: {
      name: "Dr. Jane Smith",
      email: "doctor@medidesk.com",
      password,
      role: "DOCTOR",
      specialty: "General Medicine",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "reception@medidesk.com" },
    update: {},
    create: { name: "Front Desk", email: "reception@medidesk.com", password, role: "RECEPTIONIST" },
  });

  console.log("Seeded users:", { admin: admin.email, doctor: doctor.email, receptionist: receptionist.email });
  console.log("Default password for all seeded accounts: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });