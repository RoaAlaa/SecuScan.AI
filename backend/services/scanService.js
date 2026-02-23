const prisma = require("../prismaClient");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createScan({ targetUrl, userId, email }) {
  const scan = await prisma.scan.create({
    data: {
      targetUrl,
      status: "pending",
      userId: userId || null,
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
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

module.exports = {
  createScan,
  listUserScans,
  listPendingScans,
};

