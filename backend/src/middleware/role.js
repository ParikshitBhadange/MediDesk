const { ApiError } = require("../utils/ApiError");

// Usage: requireRole("ADMIN"), requireRole("ADMIN", "DOCTOR")
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}

module.exports = { requireRole };
