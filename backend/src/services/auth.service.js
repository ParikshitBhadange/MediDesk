const crypto = require("crypto");
const { prisma } = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const { signToken } = require("../utils/jwt");
const { ApiError } = require("../utils/ApiError");

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

// Issues a short-lived reset token. In production this would be emailed;
// here it's returned so the frontend flow can be demoed end-to-end.
async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { message: "If that account exists, a reset link has been sent." };

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash, resetTokenExpiresAt },
  });

  return { message: "If that account exists, a reset link has been sent.", resetToken };
}

async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) throw new ApiError(400, "Reset link is invalid or has expired");

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetTokenHash: null, resetTokenExpiresAt: null },
  });
  return { message: "Password updated successfully" };
}

module.exports = { register, login, getMe, forgotPassword, resetPassword, PUBLIC_USER_FIELDS };
