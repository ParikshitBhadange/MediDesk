const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require("../validations/auth.validation");

const router = Router();

// A 6-digit OTP has only 1,000,000 possibilities — the generic auth limiter
// (50 / 15 min) isn't tight enough on its own to stop it being guessed, so
// these two endpoints get their own stricter ceiling. Per-account attempt
// counting (see auth.service.js) is the other half of that defense.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/forgot-password", otpRequestLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/verify-otp", otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.get("/me", requireAuth, authController.me);

module.exports = router;