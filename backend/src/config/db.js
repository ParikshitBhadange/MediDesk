const { PrismaClient } = require("@prisma/client");

// Reuse a single PrismaClient instance across hot reloads / serverless
// invocations to avoid exhausting Neon's connection pool.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

module.exports = { prisma };
