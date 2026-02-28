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
      scan_status: base.scan_status ?? undefined,
    };

    // Normalize vulnerabilities: support new shape (summary, location, Attack Scenario, Root Cause Analysis, business_impact, technical_evidence) and legacy flat shape
    if (Array.isArray(normalized.vulnerabilities)) {
      normalized.vulnerabilities = normalized.vulnerabilities.map((v) => {
        const loc = v.location || {};
        const te = v.technical_evidence || {};
        const attackScenario = v["Attack Scenario"] ?? v.attack_scenario;
        const rootCause = v["Root Cause Analysis"] ?? v.root_cause_analysis;
        return {
          type: v.type,
          severity: (v.severity || "").toUpperCase() || undefined,
          summary: v.summary,
          attack_scenario: typeof attackScenario === "string" ? attackScenario : undefined,
          root_cause_analysis: typeof rootCause === "string" ? rootCause : undefined,
          url: loc.url ?? v.url,
          method: loc.method ?? v.method,
          parameter: loc.parameter ?? v.parameter,
          business_impact: Array.isArray(v.business_impact) ? v.business_impact : (Array.isArray(v.impact) ? v.impact : undefined),
          remediation: Array.isArray(v.remediation) ? v.remediation : undefined,
          technical_evidence: v.technical_evidence,
          dbms: te.dbms ?? v.dbms,
          injection_techniques: Array.isArray(te.injection_techniques) ? te.injection_techniques : (Array.isArray(v.injection_techniques) ? v.injection_techniques : undefined),
          successful_payloads: Array.isArray(te.successful_payloads) ? te.successful_payloads : (Array.isArray(v.successful_payloads) ? v.successful_payloads : undefined),
          evidence: v.evidence ?? (Object.keys(te).length > 0 ? te : undefined),
        };
      });
    } else {
      // No vulnerabilities array — details is a single finding (e.g. new n8n flat shape with location + technical_evidence)
      const loc = base.location || {};
      const te = base.technical_evidence || {};
      const attackScenario = base["Attack Scenario"] ?? base.attack_scenario;
      const rootCause = base["Root Cause Analysis"] ?? base.root_cause_analysis;
      const single = {
        type: base.type || report.type,
        severity: (base.severity || report.severity || "").toUpperCase() || undefined,
        summary: base.summary,
        attack_scenario: typeof attackScenario === "string" ? attackScenario : undefined,
        root_cause_analysis: typeof rootCause === "string" ? rootCause : undefined,
        url: loc.url ?? base.url,
        method: loc.method ?? base.method,
        parameter: loc.parameter ?? base.parameter,
        dbms: te.dbms ?? base.dbms,
        injection_techniques: Array.isArray(te.injection_techniques) ? te.injection_techniques : (Array.isArray(base.injection_techniques) ? base.injection_techniques : undefined),
        successful_payloads: Array.isArray(te.successful_payloads) ? te.successful_payloads : (Array.isArray(base.successful_payloads) ? base.successful_payloads : undefined),
        business_impact: Array.isArray(base.business_impact) ? base.business_impact : (Array.isArray(base.impact) ? base.impact : undefined),
        remediation: Array.isArray(base.remediation) ? base.remediation : undefined,
        technical_evidence: base.technical_evidence,
        evidence: base.evidence ?? (Object.keys(te).length > 0 ? te : undefined),
      };

      const hasRealFinding =
        single.url ||
        single.method ||
        single.parameter ||
        single.dbms ||
        single.summary ||
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

    // Use first finding's type/severity for header when report-level are generic (e.g. "scan", "unknown")
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