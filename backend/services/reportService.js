const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");
const { normalizeReportItem, prepareReportsForDisplay, sortReports } = require("../utils/reportUtils");

function getSampleReport() {
  try {
    const filePath = path.join(__dirname, "..", "report.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (_) {
  
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

    let base = {};
    if (Array.isArray(report.details)) {
      if (report.details.length > 0 && Array.isArray(report.details[0]?.reports)) {
        const sorted = prepareReportsForDisplay(report.details);
        const normalizedFromArray = {
          type: report.type,
          severity: report.severity,
          scan_status: "completed",
          vulnerabilities: sorted,
        };
        if (sorted.length > 0) {
          if (!normalizedFromArray.type || normalizedFromArray.type === "scan") {
            normalizedFromArray.type = sorted[0].type;
          }
          if (!normalizedFromArray.severity || normalizedFromArray.severity === "unknown") {
            normalizedFromArray.severity = sorted[0].severity;
          }
        }
        return normalizedFromArray;
      }
      base =
        report.details[0] && typeof report.details[0] === "object" ? report.details[0] : {};
    } else if (report.details && typeof report.details === "object") {
      base = report.details;
    }

    const normalized = {
      ...base,
      type: report.type,
      severity: report.severity,
      scan_status: base.scan_status ?? undefined,
    };

    if (Array.isArray(normalized.vulnerabilities)) {
      normalized.vulnerabilities = sortReports(
        normalized.vulnerabilities.map((v) => normalizeReportItem(v))
      );
    } else if (Array.isArray(normalized.reports)) {
      normalized.vulnerabilities = prepareReportsForDisplay({ reports: normalized.reports });
    } else {
      const loc = base.location || {};
      const te = base.technical_evidence || {};
      const attackScenario = base["Attack Scenario"] ?? base.attack_scenario;
      const rootCause = base["Root Cause Analysis"] ?? base.root_cause_analysis;
      const single = normalizeReportItem({
        ...base,
        type: base.type || report.type,
        severity: base.severity || report.severity,
        attack_scenario: attackScenario,
        root_cause_analysis: rootCause,
        location: base.location,
        technical_evidence: base.technical_evidence,
      });

      const hasRealFinding =
        single.url ||
        single.method ||
        single.parameter ||
        single.dbms ||
        single.summary ||
        single.description ||
        single.payload ||
        (typeof single.evidence === "string" && single.evidence.trim()) ||
        (Array.isArray(single.injection_techniques) && single.injection_techniques.length > 0) ||
        (Array.isArray(single.successful_payloads) && single.successful_payloads.length > 0) ||
        (Array.isArray(single.business_impact) && single.business_impact.length > 0) ||
        (Array.isArray(single.remediation) && single.remediation.length > 0) ||
        (single.evidence && typeof single.evidence === "object" && Object.keys(single.evidence).length > 0) ||
        (single.type && single.type !== "scan") ||
        (single.severity && (single.severity || "").toUpperCase() !== "UNKNOWN");

      if (hasRealFinding) {
        normalized.vulnerabilities = [single];
      } else {
        normalized.vulnerabilities = [];
      }
    }

    if (normalized.vulnerabilities && normalized.vulnerabilities.length > 0) {
      const first = normalized.vulnerabilities[0];
      if (first.type && (!normalized.type || normalized.type === "scan")) normalized.type = first.type;
      if (first.severity && (!normalized.severity || normalized.severity === "unknown")) normalized.severity = first.severity;
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