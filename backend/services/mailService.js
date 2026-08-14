const nodemailer = require("nodemailer");

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

function buildTransport() {
  if (!hasSmtpConfig()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = buildTransport();
  if (!transport) {
    console.log("[mail:fallback]", { to, subject, text });
    return { fallback: true };
  }

  return transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}

function verificationEmail({ name, token }) {
  return {
    subject: "Verify your CodeVerse email",
    text: `Hi ${name || "there"}, use this verification token: ${token}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#020617;color:#e2e8f0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px">
          <h2 style="margin:0 0 12px;color:#fff">Verify your CodeVerse email</h2>
          <p style="line-height:1.6;color:#cbd5e1">Hi ${name || "there"}, welcome to CodeVerse. Use the token below to verify your email address.</p>
          <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.25);font-size:20px;font-weight:700;letter-spacing:0.16em;color:#67e8f9">${token}</div>
          <p style="line-height:1.6;color:#94a3b8">If you did not request this, you can ignore this message.</p>
        </div>
      </div>
    `,
  };
}

function passwordResetEmail({ name, token }) {
  return {
    subject: "Reset your CodeVerse password",
    text: `Hi ${name || "there"}, use this password reset token: ${token}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#020617;color:#e2e8f0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px">
          <h2 style="margin:0 0 12px;color:#fff">Reset your CodeVerse password</h2>
          <p style="line-height:1.6;color:#cbd5e1">Hi ${name || "there"}, use the token below to finish your password reset.</p>
          <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);font-size:20px;font-weight:700;letter-spacing:0.16em;color:#c4b5fd">${token}</div>
          <p style="line-height:1.6;color:#94a3b8">If you did not request this, you can ignore this message.</p>
        </div>
      </div>
    `,
  };
}

module.exports = {
  sendMail,
  verificationEmail,
  passwordResetEmail,
};
