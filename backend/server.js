const { app } = require("./src/app");
const { env } = require("./src/config/env");
const { prisma } = require("./src/config/db");

const server = app.listen(env.port, () => {
  console.log(`HospitalCore API listening on port ${env.port} [${env.nodeEnv}]`);
});

async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
