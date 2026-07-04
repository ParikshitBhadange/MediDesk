const crypto = require("crypto");
const { prisma } = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const { signToken } = require("../utils/jwt");
const { ApiError } = require("../utils/ApiError");
const { sendOtpEmail } = require("../utils/mailer");

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes to actually submit the new password

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtp() {
  // Cryptographically random 6-digit code, zero-padded (e.g. "004821")
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  specialty: true,
  phone: true,
  createdAt: true,
};

async function register({ name, email, password, role, specialty }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, specialty: specialty || null },
    select: PUBLIC_USER_FIELDS,
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  const token = signToken({ sub: user.id, role: user.role });
  const { password: _omit, ...safeUser } = user;
  return { user: safeUser, token };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

const GENERIC_OTP_RESPONSE = { message: "If that account exists, we've emailed a 6-digit code to it." };

// Step 1 — request a reset. Generates a 6-digit OTP, emails it, and stores
// only its hash. The OTP itself is NEVER put in the API response — the only
// place it's ever exposed is the inbox of the address on the account. The
// response is identical whether or not the account exists, so this endpoint
// can't be used to enumerate registered emails either.
async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return GENERIC_OTP_RESPONSE;

  const otp = generateOtp();
  const otpHash = hashValue(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    // Requesting a new OTP invalidates any earlier, still-unused reset
    // session so only the most recent code/token pair is ever valid.
    data: { otpHash, otpExpiresAt, otpAttempts: 0, resetTokenHash: null, resetTokenExpiresAt: null },
  });

  await sendOtpEmail(user.email, otp, { name: user.name });

  return GENERIC_OTP_RESPONSE;
}

// Step 2 — verify the code the user got by email. Only on a correct match
// do we issue a short-lived reset session token, which is what actually
// authorizes resetPassword below. This is the fix for the account-takeover
// bug: nothing secret leaves the server until mailbox ownership is proven.
async function verifyOtp(email, otp) {
  const user = await prisma.user.findUnique({ where: { email } });
  const invalid = () => new ApiError(400, "Invalid or expired code");

  if (!user || !user.otpHash || !user.otpExpiresAt) throw invalid();
  if (user.otpExpiresAt.getTime() < Date.now()) throw invalid();
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect attempts. Please request a new code.");
  }

  if (hashValue(otp) !== user.otpHash) {
    await prisma.user.update({ where: { id: user.id }, data: { otpAttempts: { increment: 1 } } });
    throw invalid();
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = hashValue(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + RESET_SESSION_EXPIRY_MS);

  // Burn the OTP the moment it's used — one code, one use.
  await prisma.user.update({
    where: { id: user.id },
    data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0, resetTokenHash, resetTokenExpiresAt },
  });

  return { resetToken };
}

// Step 3 — actually change the password. Requires the reset token from
// verifyOtp, not the OTP itself, and that token only exists server-side
// after step 2 succeeded.
async function resetPassword(token, newPassword) {
  const tokenHash = hashValue(token);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) throw new ApiError(400, "Reset session is invalid or has expired — please request a new code");

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetTokenHash: null, resetTokenExpiresAt: null },
  });
  return { message: "Password updated successfully" };
}

module.exports = { register, login, getMe, forgotPassword, verifyOtp, resetPassword, PUBLIC_USER_FIELDS };