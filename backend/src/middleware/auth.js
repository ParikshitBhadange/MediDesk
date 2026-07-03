const { verifyToken } = require("../utils/jwt");
const { ApiError } = require("../utils/ApiError");
const { prisma } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");

// Verifies the bearer token, loads a minimal current-user record, and
// attaches it to req.user for downstream controllers/role checks.
const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    throw new ApiError(401, "No authorization token provided");
  }

  const token = header.slice("Bearer ".length);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, specialty: true, phone: true },
  });
  if (!user) throw new ApiError(401, "User no longer exists");

  req.user = user;
  next();
});

module.exports = { requireAuth };
