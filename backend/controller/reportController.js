const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");

function getSampleReport() {
  try {
    const filePath = path.join(__dirname, "..", "report.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (_) {}
  return null;
}

exports.getReport = async (req, res) => {
  try {
    const { scanId } = req.params;
    const { token } = req.query;
    const userId = req.userId || null;

    if (!scanId) {
      return res.status(400).json({ error: "Scan ID required" });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { reports: true },
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    let allowed = false;
    if (userId && scan.userId === userId) {
      allowed = true;
    }
    if (!allowed && token) {
      const access = await prisma.reportAccess.findFirst({
        where: { scanId, token },
      });
      if (access && new Date() < access.expiresAt) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this report" });
    }

    if (scan.reports && scan.reports.length > 0) {
      const report = scan.reports[0];
      return res.json({
        ...report.details,
        type: report.type,
        severity: report.severity,
      });
    }

    const sample = getSampleReport();
    if (sample) {
      return res.json(sample);
    }

    return res.status(404).json({ error: "Report not ready yet" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load report" });
  }
};
