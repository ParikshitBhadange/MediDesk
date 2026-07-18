const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { env } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const adminRoutes = require("./routes/admin.routes");
const appointmentRoutes = require("./routes/appointment.routes");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
// Gzip every JSON response — patient/queue lists are the most frequently
// polled endpoints in the app, and compression cuts their transfer size
// (and therefore time-to-render) substantially over slower connections.
app.use(compression());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Generous limiter on auth endpoints only — keeps brute-force attempts in
// check without throttling normal dashboard traffic.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", authLimiter);

app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok", uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/appointments", appointmentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };