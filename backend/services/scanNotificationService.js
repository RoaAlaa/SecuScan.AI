const prisma = require("../prismaClient");
const { sendScanCompleteEmail } = require("./emailService");

async function notifyScanComplete(scanId) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!scan?.userId) {
    console.log(`[email] Skipped: scan ${scanId} has no logged-in user`);
    return;
  }

  const user = scan.user || (await prisma.user.findUnique({
    where: { id: scan.userId },
    select: { name: true, email: true },
  }));

  if (!user?.email) {
    console.log(`[email] Skipped: no account email for scan ${scanId}`);
    return;
  }

  await sendScanCompleteEmail({
    userName: user.name,
    recipientEmail: user.email,
    targetUrl: scan.targetUrl,
  });
}

module.exports = { notifyScanComplete };
