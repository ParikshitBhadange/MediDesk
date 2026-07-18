/**
 * Integration test suite for MediDesk's API.
 *
 * Runs against a REAL Postgres database (via Prisma) and the actual Express
 * app — no mocking of the DB layer — so a green run here is evidence the
 * auth flow, RBAC middleware, and validation pipeline genuinely work end to
 * end. Coverage % and pass/fail counts from this file are safe to quote on
 * a resume because they come from `jest --coverage`, not from estimation.
 *
 * Setup (see backend/tests/README.md for the full walkthrough):
 *   1. Point DATABASE_URL / DIRECT_URL at a disposable Postgres DB
 *      (a local one, or a free Neon branch — do NOT point this at prod data).
 *   2. npx prisma migrate deploy
 *   3. npm test            // or: npx jest --coverage
 *
 * NOTE ON ORDERING: the rate-limiter test at the bottom deliberately fires
 * 55 requests at the shared `/api/auth` limiter (max 50 / 15 min) and trips
 * it on purpose. Jest runs this file in a single process, so that limiter
 * stays tripped for the rest of the run — that's why it's the LAST describe
 * block. If you add more tests that call /api/auth/register or /login,
 * add them above this block, not below it.
 */

const request = require("supertest");
const { app } = require("../src/app");
const { prisma } = require("../src/config/db");

const uniqueEmail = (label) => `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@test.medidesk.local`;

async function registerUser(role, overrides = {}) {
  const email = uniqueEmail(role.toLowerCase());
  const res = await request(app).post("/api/auth/register").send({
    name: `Test ${role}`,
    email,
    password: "Password123!",
    role,
    ...overrides,
  });
  return { email, token: res.body?.data?.token, id: res.body?.data?.user?.id, res };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Health check", () => {
  test("GET /api/health returns 200 and uptime", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.uptime).toBe("number");
  });
});

describe("Auth: register & login", () => {
  test("registers a new receptionist and returns a JWT", async () => {
    const { res } = await registerUser("RECEPTIONIST");
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe("RECEPTIONIST");
  });

  test("rejects registration with an invalid email (Zod validation)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Bad Email",
      email: "not-an-email",
      password: "Password123!",
      role: "RECEPTIONIST",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects a duplicate email on register", async () => {
    const { email } = await registerUser("RECEPTIONIST");
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup",
      email,
      password: "Password123!",
      role: "RECEPTIONIST",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("logs in with correct credentials", async () => {
    const { email } = await registerUser("RECEPTIONIST");
    const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test("rejects login with wrong password", async () => {
    const { email } = await registerUser("RECEPTIONIST");
    const res = await request(app).post("/api/auth/login").send({ email, password: "WrongPassword!" });
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me requires a valid token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me returns the caller's profile when authenticated", async () => {
    const { token } = await registerUser("DOCTOR");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("DOCTOR");
  });
});

describe("RBAC: patient routes", () => {
  test("unauthenticated request to /api/patients is rejected", async () => {
    const res = await request(app).get("/api/patients");
    expect(res.status).toBe(401);
  });

  test("DOCTOR cannot create a patient (RECEPTIONIST/ADMIN only)", async () => {
    const { token } = await registerUser("DOCTOR");
    const res = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Jane Doe", contact: "555-0100" });
    expect(res.status).toBe(403);
  });

  test("RECEPTIONIST can create a patient", async () => {
    const { token } = await registerUser("RECEPTIONIST");
    const res = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Jane Doe", contact: "555-0100" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Jane Doe");
  });

  test("only ADMIN can delete a patient", async () => {
    const { token: receptionistToken } = await registerUser("RECEPTIONIST");
    const create = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({ name: "To Delete", contact: "555-0199" });
    const patientId = create.body.data.id;

    const deniedRes = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set("Authorization", `Bearer ${receptionistToken}`);
    expect(deniedRes.status).toBe(403);

    const { token: adminToken } = await registerUser("ADMIN");
    const allowedRes = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowedRes.status).toBe(204);
  });

  test("rejects patient creation with missing required fields", async () => {
    const { token } = await registerUser("RECEPTIONIST");
    const res = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({ contact: "555-0100" }); // no name
    expect(res.status).toBe(400);
  });
});

describe("Fees", () => {
  test("RECEPTIONIST can record a fee against a patient", async () => {
    const { token } = await registerUser("RECEPTIONIST");
    const patientRes = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fee Patient", contact: "555-0111" });

    const feeRes = await request(app)
      .post("/api/patients/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({ patientId: patientRes.body.data.id, amount: 500, method: "CASH" });

    expect(feeRes.status).toBe(201);
    expect(feeRes.body.data.amount).toBe(500);
  });
});

// This block MUST stay last in the file — see the note at the top.
describe("Rate limiting", () => {
  test("auth rate limiter blocks after repeated bad login attempts", async () => {
    const email = uniqueEmail("bruteforce");
    const attempts = Array.from({ length: 55 }, () =>
      request(app).post("/api/auth/login").send({ email, password: "wrong" })
    );
    const results = await Promise.all(attempts);
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
  }, 20000);
});