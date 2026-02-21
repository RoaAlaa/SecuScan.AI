const prisma = require("../prismaClient");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

exports.startScan = async (req, res) => {
  try {
    const { targetUrl, email } = req.body;
    const userId = req.userId || null;

    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
      return res.status(400).json({ error: "Target URL is required" });
    }

    const url = targetUrl.trim();

    if (!userId && (!email || typeof email !== "string" || !email.trim())) {
      return res.status(400).json({ error: "Email is required for guest scans" });
    }

    const scan = await prisma.scan.create({
      data: {
        targetUrl: url,
        status: "pending",
        userId: userId || null,
      },
    });

    let reportWillBeSentTo = null;
    let accessToken = null;

    if (!userId) {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.reportAccess.create({
        data: {
          scanId: scan.id,
          email: email.trim().toLowerCase(),
          token,
          expiresAt,
        },
      });
      reportWillBeSentTo = email.trim();
      accessToken = token;
    }

    res.status(201).json({
      scanId: scan.id,
      message: "Scan started. The report will be sent to your email when finished.",
      reportWillBeSentTo: reportWillBeSentTo || (req.user && req.user.email) || null,
      reportLink: accessToken
        ? `${process.env.FRONTEND_URL || "http://localhost:5173"}/report/${scan.id}?token=${accessToken}`
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start scan" });
  }
};

exports.getMyScans = async (req, res) => {
  try {
    const userId = req.userId;
    const scans = await prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { reports: true },
    });
    res.json(scans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scans" });
  }
};

exports.getPendingScans = async (req, res) => {
  try {
    const userId = req.userId;
    const scans = await prisma.scan.findMany({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    res.json(scans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending scans" });
  }
};
