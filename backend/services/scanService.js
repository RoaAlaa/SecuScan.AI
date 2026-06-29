const prisma = require("../prismaClient");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createScan({ targetUrl, userId, email, crawlMode, selectedVulnerabilities }) {
  const scan = await prisma.scan.create({
    data: {
      targetUrl,
      status: "pending",
      userId: userId || null,
      crawlMode: crawlMode ?? null,
      selectedVulnerabilities: selectedVulnerabilities ?? null,
    },
  });

  let accessToken = null;
  let reportWillBeSentTo = null;

  if (!userId && email) {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.reportAccess.create({
      data: {
        scanId: scan.id,
        email: email.toLowerCase(),
        token,
        expiresAt,
      },
    });

    accessToken = token;
    reportWillBeSentTo = email;
  }

  return { scan, accessToken, reportWillBeSentTo };
}

async function listUserScans(userId) {
  return prisma.scan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { reports: true },
  });
}

async function listPendingScans(userId) {
  return prisma.scan.findMany({
    where: {
      userId,
      status: { in: ["pending", "running"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

const { deleteChunksByScan } = require("./vectorUtils");

async function deleteScan(scanId, userId) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
  });
  if (!scan) {
    const err = new Error("Scan not found");
    err.statusCode = 404;
    throw err;
  }
  if (scan.userId !== userId) {
    const err = new Error("You can only delete your own scans");
    err.statusCode = 403;
    throw err;
  }
  await deleteChunksByScan(scanId);
  await prisma.reportAccess.deleteMany({ where: { scanId } });
  await prisma.workflowRun.deleteMany({ where: { scanId } });
  await prisma.report.deleteMany({ where: { scanId } });
  await prisma.scan.delete({ where: { id: scanId } });
}

module.exports = {
  createScan,
  listUserScans,
  listPendingScans,
  deleteScan,
};
