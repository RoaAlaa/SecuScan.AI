/**
 * Report ingestion: convert report JSON to text, chunk, embed, and store in DocumentChunk
 * with sourceType = "report" and scanId for access control.
 * Call after a report is saved (e.g. from webhook or report creation endpoint).
 */

const { splitIntoChunks } = require("./chunking");
const { storeChunks, deleteChunksByScan } = require("./vectorUtils");

/**
 * Convert report details (JSON) into a single readable text for chunking.
 * Handles common shapes: { findings: [], summary: "", ... } or flat key-value.
 * @param {Object} details - report.details (JSON)
 * @param {string} [type] - report type
 * @param {string} [severity] - report severity
 * @returns {string}
 */
function reportToText(details, type = "", severity = "") {
  const parts = [];

  if (type) parts.push(`Type: ${type}`);
  if (severity) parts.push(`Severity: ${severity}`);
  if (details && typeof details === "object") {
    if (details.scan_status && String(details.scan_status).trim()) parts.push(`Scan status: ${String(details.scan_status).trim()}`);
    if (details.summary) parts.push(`Summary: ${details.summary}`);
    if (details.findings && Array.isArray(details.findings)) {
      details.findings.forEach((f, i) => {
        const block = typeof f === "string" ? f : JSON.stringify(f, null, 0);
        parts.push(`Finding ${i + 1}: ${block}`);
      });
    }
    if (details.vulnerabilities && Array.isArray(details.vulnerabilities)) {
      details.vulnerabilities.forEach((v, i) => {
        if (typeof v === "string") {
          parts.push(`Vulnerability ${i + 1}: ${v}`);
          return;
        }
        // Shape: summary, location, Attack Scenario, Root Cause Analysis, business_impact, remediation, technical_evidence
        const lines = [];
        if (v.type) lines.push(`Type: ${v.type}`);
        if (v.severity) lines.push(`Severity: ${v.severity}`);
        if (v.summary) lines.push(`Summary: ${v.summary}`);
        const attackScenario = v["Attack Scenario"] ?? v.attack_scenario;
        if (attackScenario && String(attackScenario).trim()) lines.push(`Attack Scenario: ${String(attackScenario).trim()}`);
        const rootCause = v["Root Cause Analysis"] ?? v.root_cause_analysis;
        if (rootCause && String(rootCause).trim()) lines.push(`Root Cause Analysis: ${String(rootCause).trim()}`);
        const loc = v.location || {};
        if (loc.url || loc.method || loc.parameter) {
          lines.push(`Location: ${loc.url || ""} | ${loc.method || ""} | ${loc.parameter || ""}`);
        }
        if (v.business_impact?.length) lines.push(`Business impact: ${v.business_impact.join("; ")}`);
        if (v.remediation?.length) lines.push(`Remediation: ${v.remediation.join("; ")}`);
        const te = v.technical_evidence || {};
        if (te.dbms) lines.push(`DBMS: ${te.dbms}`);
        if (te.injection_techniques?.length) lines.push(`Injection techniques: ${te.injection_techniques.join(", ")}`);
        if (te.successful_payloads?.length) lines.push(`Payloads: ${te.successful_payloads.join(" | ")}`);
        if (lines.length > 0) {
          parts.push(`Vulnerability ${i + 1}:\n${lines.join("\n")}`);
        } else {
          parts.push(`Vulnerability ${i + 1}: ${JSON.stringify(v, null, 0)}`);
        }
      });
    }
    // Fallback: flatten object into lines
    if (parts.length <= 2) {
      for (const [key, value] of Object.entries(details)) {
        if (key === "summary" || key === "findings" || key === "vulnerabilities") continue;
        const val = typeof value === "object" ? JSON.stringify(value) : String(value);
        parts.push(`${key}: ${val}`);
      }
    }
  }

  return parts.join("\n\n").trim() || JSON.stringify(details);
}

/**
 * Ingest a report into DocumentChunk: delete existing report chunks for this scan,
 * then convert report to text, chunk, embed, and store.
 * @param {Object} params
 * @param {string} params.scanId - Scan ID (required)
 * @param {string} params.reportId - Report ID
 * @param {string} [params.type] - Report type
 * @param {string} [params.severity] - Report severity
 * @param {Object} params.details - Report details (JSON)
 * @returns {Promise<number>} - Number of chunks stored
 */
async function ingestReportForScan({ scanId, reportId, type, severity, details }) {
  if (!scanId) {
    throw new Error("scanId is required for report ingestion");
  }

  const text = reportToText(details, type, severity);
  if (!text || text.length < 10) {
    return 0;
  }

  const chunks = splitIntoChunks(text).map((content) => ({
    content,
    sourceType: "report",
    scanId,
    reportId: reportId || null,
    metadata: { type: type || null, severity: severity || null },
  }));

  if (chunks.length === 0) return 0;

  await deleteChunksByScan(scanId);
  const ids = await storeChunks(chunks);
  return ids.length;
}

module.exports = {
  reportToText,
  ingestReportForScan,
};
