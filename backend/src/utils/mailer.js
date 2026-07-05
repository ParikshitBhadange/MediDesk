const { env } = require("../config/env");
const { ApiError } = require("./ApiError");

// Resend's REST API over plain HTTPS. Using this instead of an SMTP socket
// sidesteps SMTP-port flakiness on free-tier hosts and needs no extra
// dependency — Node 18+ ships a global fetch().
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function otpEmailHtml(otp, name) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
    <h2 style="margin: 0 0 8px; font-size: 20px;">MediDesk password reset</h2>
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
  if (!env.resendApiKey) {
    // Fail loudly rather than silently "succeeding" a forgot-password
    // request that never actually sends anything.
    throw new ApiError(500, "Email service is not configured");
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.mailFrom,
      to,
      // Resend can't send AS your Gmail address (it can only send from a
      // domain you've verified in Resend's DNS records — gmail.com isn't
      // yours to verify). reply_to is the real-world workaround: the email
      // shows as coming from `from`, but hitting "Reply" goes to your inbox.
      reply_to: env.mailReplyTo || undefined,
      subject: "Your MediDesk password reset code",
      text: `Your MediDesk password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
      html: otpEmailHtml(otp, name),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // Logged server-side only — never leaked to the client response.
    console.error(`Resend send failed (${response.status}):`, detail);
    throw new ApiError(502, "Failed to send the verification email. Please try again.");
  }
}

module.exports = { sendOtpEmail };