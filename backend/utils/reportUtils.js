const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const VALID_SCANS = ["sqlmap", "sstimap", "ssrfmap", "lfi"];
const FULL_SCAN = [...VALID_SCANS];

function getSeverityWeight(severity) {
  return SEVERITY_WEIGHT[(severity || "").toLowerCase()] ?? -1;
}

/**
 * Extract reports from n8n nested payload: [{ reports: [...] }]
 */
function extractReportsList(data) {
  if (!data) return [];

  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.reports)) {
    return data[0].reports;
  }

  if (Array.isArray(data.reports)) {
    return data.reports;
  }

  if (Array.isArray(data.vulnerabilities)) {
    return data.vulnerabilities;
  }

  return [];
}

function sortReports(reports) {
  if (!Array.isArray(reports)) return [];

  return [...reports].sort((a, b) => {
    const weightDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
    if (weightDiff !== 0) return weightDiff;

    const nameA = (a.vulnerability || a.type || "").toLowerCase();
    const nameB = (b.vulnerability || b.type || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function formatVulnerabilityLabel(name) {
  if (name == null || String(name).trim() === "") return "Vulnerability";
  let label = String(name).trim();
  if (!/ssti/i.test(label)) return label;

  label = label
    .replace(/\s*[-–—|:]\s*remote\s+code\s+execution\s*/gi, "")
    .replace(/\s*\(\s*remote\s+code\s+execution\s*\)\s*/gi, " ")
    .replace(/\s+remote\s+code\s+execution\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—|:]\s*$/g, "")
    .trim();

  return label || "Vulnerability";
}

function normalizeReportItem(item) {
  if (!item || typeof item !== "object") return item;

  const rawName = item.vulnerability || item.type;
  const displayName = formatVulnerabilityLabel(rawName);

  const loc = item.location || {};
  const attackScenario = item["Attack Scenario"] ?? item.attack_scenario ?? item.steps_to_reproduce;
  const rootCause = item["Root Cause Analysis"] ?? item.root_cause_analysis;
  const te = item.technical_evidence || {};

  return {
    type: displayName,
    vulnerability: displayName,
    severity: (item.severity || "").toUpperCase() || undefined,
    summary: item.summary ?? item.description,
    description: item.description ?? item.summary,
    attack_scenario: typeof attackScenario === "string" ? attackScenario : undefined,
    steps_to_reproduce: item.steps_to_reproduce ?? (typeof attackScenario === "string" ? attackScenario : undefined),
    root_cause_analysis: typeof rootCause === "string" ? rootCause : undefined,
    url: loc.url ?? item.url,
    method: loc.method ?? item.method,
    parameter: loc.parameter ?? item.parameter,
    payload: item.payload,
    evidence: item.evidence,
    impact: item.impact,
    recommendation: item.recommendation,
    business_impact: Array.isArray(item.business_impact)
      ? item.business_impact
      : Array.isArray(item.impact)
        ? item.impact
        : typeof item.impact === "string"
          ? [item.impact]
          : undefined,
    remediation: Array.isArray(item.remediation)
      ? item.remediation
      : typeof item.recommendation === "string"
        ? [item.recommendation]
        : undefined,
    technical_evidence: item.technical_evidence,
    dbms: te.dbms ?? item.dbms,
    injection_techniques: Array.isArray(te.injection_techniques)
      ? te.injection_techniques
      : Array.isArray(item.injection_techniques)
        ? item.injection_techniques
        : undefined,
    successful_payloads: Array.isArray(te.successful_payloads)
      ? te.successful_payloads
      : Array.isArray(item.successful_payloads)
        ? item.successful_payloads
        : undefined,
  };
}

function prepareReportsForDisplay(data) {
  const raw = extractReportsList(data);
  const normalized = raw.map(normalizeReportItem);
  return sortReports(normalized);
}

function normalizeScansInput(scans) {
  if (!Array.isArray(scans) || scans.length === 0) {
    return FULL_SCAN;
  }

  const normalized = scans
    .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
    .filter(Boolean);

  if (normalized.includes("full") || normalized.includes("full_scan")) {
    return FULL_SCAN;
  }

  const valid = normalized.filter((s) => VALID_SCANS.includes(s));
  return valid.length > 0 ? [...new Set(valid)] : null;
}

module.exports = {
  VALID_SCANS,
  FULL_SCAN,
  extractReportsList,
  sortReports,
  normalizeReportItem,
  prepareReportsForDisplay,
  normalizeScansInput,
  getSeverityWeight,
};
