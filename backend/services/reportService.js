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
  } catch (_) {
    // ignore sample report errors
  }
  return null;
}

async function getReportForScan({ scanId, userId, token }) {
  if (!scanId) {
    const error = new Error("Scan ID required");
    error.statusCode = 400;
    throw error;
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { reports: true },
  });

  if (!scan) {
    const error = new Error("Scan not found");
    error.statusCode = 404;
    throw error;
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
    const error = new Error("You do not have access to this report");
    error.statusCode = 403;
    throw error;
  }

  if (scan.reports && scan.reports.length > 0) {
    const report = scan.reports[0];
    return {
      ...report.details,
      type: report.type,
      severity: report.severity,
    };
  }

  const sample = getSampleReport();
  if (sample) {
    return sample;
  }

  const error = new Error("Report not ready yet");
  error.statusCode = 404;
  throw error;
}

module.exports = {
  getReportForScan,
};

