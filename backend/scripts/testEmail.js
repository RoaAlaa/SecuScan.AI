require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { sendScanCompleteEmail, isEmailConfigured } = require("../services/emailService");

const to = process.argv[2];

async function main() {
  if (!isEmailConfigured()) {
    console.error("SMTP_HOST is not set in backend/.env");
    process.exit(1);
  }
  if (!to) {
    console.error("Usage: node scripts/testEmail.js you@example.com");
    process.exit(1);
  }

  await sendScanCompleteEmail({
    userName: "Test User",
    recipientEmail: to,
    targetUrl: "https://example.com",
  });

  console.log("Test email sent to", to);
}

main().catch((err) => {
  console.error("Failed to send test email:", err.message);
  process.exit(1);
});
