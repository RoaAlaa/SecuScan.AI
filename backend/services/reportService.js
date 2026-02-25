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
    include: { reports: { orderBy: { createdAt: "desc" }, take: 1 } },
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

    const base =
      report.details &&
      typeof report.details === "object" &&
      !Array.isArray(report.details)
        ? report.details
        : {};

    const normalized = {
      ...base,
      type: report.type,
      severity: report.severity,
    };

    // If no vulnerabilities array exists, wrap single finding
    if (!Array.isArray(normalized.vulnerabilities)) {
      const single = {
        type: base.type || report.type,
        url: base.url,
        method: base.method,
        parameter: base.parameter,
        dbms: base.dbms,
        injection_techniques: Array.isArray(base.injection_techniques)
          ? base.injection_techniques
          : undefined,
        successful_payloads: Array.isArray(base.successful_payloads)
          ? base.successful_payloads
          : undefined,

        // ✅ NEW FIELDS
        impact: Array.isArray(base.impact) ? base.impact : undefined,
        remediation: Array.isArray(base.remediation)
          ? base.remediation
          : undefined,

        evidence: base.evidence,
        severity:
          (base.severity || report.severity || "").toUpperCase() ||
          undefined,
      };

      const hasContent =
        single.type ||
        single.url ||
        single.method ||
        single.parameter ||
        single.dbms ||
        (Array.isArray(single.injection_techniques) &&
          single.injection_techniques.length > 0) ||
        (Array.isArray(single.successful_payloads) &&
          single.successful_payloads.length > 0) ||
        (Array.isArray(single.impact) && single.impact.length > 0) ||
        (Array.isArray(single.remediation) &&
          single.remediation.length > 0) ||
        (single.evidence &&
          typeof single.evidence === "object" &&
          Object.keys(single.evidence).length > 0);

      if (hasContent) {
        normalized.vulnerabilities = [single];
      }
    }

    return normalized;
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