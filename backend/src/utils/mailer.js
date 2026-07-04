const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const { ApiError } = require("./ApiError");

let transporter;

function getTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    // Fail loudly rather than silently "succeeding" a forgot-password
    // request that never actually sends anything.
    throw new ApiError(500, "Email service is not configured");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465, // true for 465 (implicit TLS), false for 587 (STARTTLS)
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return transporter;
}

function otpEmailHtml(otp, name) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
    <h2 style="margin: 0 0 8px; font-size: 20px;">HospitalCore password reset</h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px;">
      Hi${name ? ` ${name}` : ""}, use the code below to reset your password. It expires in
      <strong>10 minutes</strong>.
    </p>
    <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otp}</span>
    </div>
    <p style="margin: 0; color: #6b7280; font-size: 13px;">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  </div>`;
}

async function sendOtpEmail(to, otp, { name } = {}) {
  await getTransporter().sendMail({
    from: env.mailFrom,
    to,
    subject: "Your HospitalCore password reset code",
    text: `Your HospitalCore password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: otpEmailHtml(otp, name),
  });
}

module.exports = { sendOtpEmail };