const nodemailer = require("nodemailer");

let transporter = null;

function isEmailConfigured() {
  const host = (process.env.SMTP_HOST || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  if (!host || !pass || pass.includes("PASTE_")) return false;
  return true;
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const host = process.env.SMTP_HOST.trim();

  if (host.includes("gmail.com")) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    return transporter;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

function buildScanCompleteEmail({ userName, targetUrl, websiteUrl }) {
  const subject = "Your Vulnerability Scan Report Is Ready";

  const text = `Hello ${userName},

Your vulnerabilities scan has been completed successfully.

Target:
${targetUrl}

Your report is now available in your account dashboard.

For security reasons, scan reports are only accessible after authentication. Please log in to your account to view the complete results.

You can access the website here:
${websiteUrl}

After logging in, navigate to:
Reports / History

Thank you for using our platform.

Best regards,
Secu Scan Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <p>Hello ${userName},</p>
  <p>Your vulnerabilities scan has been completed successfully.</p>
  <p><strong>Target:</strong><br>${targetUrl}</p>
  <p>Your report is now available in your account dashboard.</p>
  <p>For security reasons, scan reports are only accessible after authentication. Please log in to your account to view the complete results.</p>
  <p>You can access the website here:<br><a href="${websiteUrl}">${websiteUrl}</a></p>
  <p>After logging in, navigate to:<br><strong>Reports / History</strong></p>
  <p>Thank you for using our platform.</p>
  <p>Best regards,<br>Secu Scan Team</p>
</body>
</html>`;

  return { subject, text, html };
}

async function sendScanCompleteEmail({ userName, recipientEmail, targetUrl }) {
  if (!recipientEmail) {
    console.log("[email] Skipped: no recipient email for scan");
    return false;
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error("Email service is not configured on the server");
  }

  const websiteUrl = process.env.FRONTEND_URL || "http://localhost:3100";
  const from = process.env.EMAIL_FROM || "Secu Scan <noreply@secuscan.ai>";
  const { subject, text, html } = buildScanCompleteEmail({ userName, targetUrl, websiteUrl });

  await transport.sendMail({ from, to: recipientEmail, subject, text, html });
  console.log(`[email] Scan-complete notification sent to ${recipientEmail}`);
  return true;
}

module.exports = { sendScanCompleteEmail, isEmailConfigured };
