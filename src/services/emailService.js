const nodemailer = require("nodemailer");

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_FROM || '"INMinut Security" <no-reply@inminut.com>';

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Service] Email successfully sent to ${to}: "${subject}"`);
      return true;
    } catch (error) {
      console.error(`[Email Service] Failed to send email to ${to}:`, error);
      throw new Error("Failed to send email notification");
    }
  } else {
    // Development fallback logger
    console.log("================================================================================");
    console.log(`[DEV EMAIL SERVICE SIMULATION]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text Body:\n${text}`);
    console.log("================================================================================");
    return true;
  }
};

const sendVerificationEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  const subject = "Verify your INMinut account email";
  const text = `Hello,\n\nPlease verify your email address by opening the following link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Verify Your INMinut Account Email</h2>
      <p>Please click the button below to verify your email address:</p>
      <p style="margin: 25px 0;">
        <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p style="color: #666; font-size: 13px; margin-top: 30px;">This link will expire in 24 hours. If you did not create an account, no further action is required.</p>
    </div>
  `;

  return await sendEmail({ to: email, subject, text, html });
};

const sendPasswordResetEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const subject = "Reset your INMinut account password";
  const text = `Hello,\n\nYou requested a password reset for your INMinut account.\nPlease click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please secure your account immediately.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your INMinut account. Click the button below to set a new password:</p>
      <p style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color: #666; font-size: 13px; margin-top: 30px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
    </div>
  `;

  return await sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
