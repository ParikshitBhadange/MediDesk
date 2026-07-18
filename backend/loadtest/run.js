/**
 * Load test for MediDesk's API using autocannon.
 *
 * This produces REAL numbers (req/sec, latency p50/p95/p99, throughput) —
 * nothing here is estimated. Run it against your own machine/DB and quote
 * whatever it actually prints; don't reuse these example numbers as-is.
 *
 * Usage:
 *   1. Start the API:            npm run dev        (in backend/)
 *   2. Seed demo data:           npm run seed
 *   3. Run this script:          node loadtest/run.js
 *
 * Env overrides:
 *   BASE_URL   default http://localhost:5000
 *   DURATION   seconds per scenario, default 15
 *   CONNECTIONS concurrent connections, default 20
 */

const autocannon = require("autocannon");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const DURATION = Number(process.env.DURATION || 15);
const CONNECTIONS = Number(process.env.CONNECTIONS || 20);

const RECEPTION_LOGIN = { email: "reception@medidesk.com", password: "Password123!" };
const DOCTOR_LOGIN = { email: "doctor@medidesk.com", password: "Password123!" };

function summarize(label, result) {
  const { requests, latency, throughput, errors, timeouts, non2xx } = result;
  console.log(`\n=== ${label} ===`);
  console.log(`  requests/sec (avg): ${requests.average}`);
  console.log(`  requests/sec (min/max): ${requests.min} / ${requests.max}`);
  console.log(`  latency ms  p50/p95/p99: ${latency.p50} / ${latency.p97_5} / ${latency.p99}`);
  console.log(`  latency ms  avg/max: ${latency.average} / ${latency.max}`);
  console.log(`  throughput (bytes/sec avg): ${throughput.average}`);
  console.log(`  errors: ${errors}  timeouts: ${timeouts}  non-2xx: ${non2xx}`);
  return result;
}

async function login(credentials) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    throw new Error(
      `Login failed (${res.status}) for ${credentials.email}. Did you run "npm run seed"?`
    );
  }
  const body = await res.json();
  return body.data.token;
}

async function run() {
  console.log(`Load testing ${BASE_URL} — ${CONNECTIONS} connections, ${DURATION}s per scenario\n`);

  const health = await autocannon({
    url: `${BASE_URL}/api/health`,
    connections: CONNECTIONS,
    duration: DURATION,
  });
  summarize("GET /api/health (unauthenticated baseline)", health);

  const receptionToken = await login(RECEPTION_LOGIN);
  const receptionHeaders = { authorization: `Bearer ${receptionToken}` };

  const patientsList = await autocannon({
    url: `${BASE_URL}/api/patients`,
    connections: CONNECTIONS,
    duration: DURATION,
    headers: receptionHeaders,
  });
  summarize("GET /api/patients (authenticated read, Prisma query)", patientsList);

  const doctorToken = await login(DOCTOR_LOGIN);
  const doctorHeaders = { authorization: `Bearer ${doctorToken}` };

  const queue = await autocannon({
    url: `${BASE_URL}/api/doctor/queue`,
    connections: CONNECTIONS,
    duration: DURATION,
    headers: doctorHeaders,
  });
  summarize("GET /api/doctor/queue (authenticated read)", queue);

  const createPatient = await autocannon({
    url: `${BASE_URL}/api/patients`,
    method: "POST",
    connections: CONNECTIONS,
    duration: DURATION,
    headers: { ...receptionHeaders, "content-type": "application/json" },
    body: JSON.stringify({ name: "Load Test Patient", contact: "555-0000" }),
  });
  summarize("POST /api/patients (authenticated write, Zod validation + DB insert)", createPatient);

  console.log("\nDone. Paste the numbers above into your resume notes — these are your real results.");
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});