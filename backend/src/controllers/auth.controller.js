const authService = require("../services/auth.service");
const auditService = require("../services/audit.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  await auditService.logAction({ userId: user.id, action: "REGISTER", entity: "User", entityId: user.id });
  created(res, { user, token });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  await auditService.logAction({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });
  ok(res, { user, token });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ok(res, user);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  ok(res, result);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  ok(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  ok(res, result);
});

module.exports = { register, login, me, forgotPassword, verifyOtp, resetPassword };