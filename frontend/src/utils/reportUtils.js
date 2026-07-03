const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export const SCAN_TOOLS = [
  { id: "sqli", label: "SQL Injection" },
  { id: "ssti", label: "SSTI" },
  { id: "ssrf", label: "SSRF" },
  { id: "bac", label: "Broken Access Control" },
  { id: "path_traversal", label: "Path Traversal" },
];

export const FULL_SCAN_TOOLS = SCAN_TOOLS.map((t) => t.id);

export const CRAWL_MODES = [
  { value: 1, label: "Mode 1", description: "Basic crawl (target URL only)" },
  { value: 2, label: "Mode 2", description: "Dual-user session crawl" },
  { value: 3, label: "Mode 3", description: "Admin + dual-user session crawl" },
];

/**
 * Extract reports from n8n nested payload: [{ reports: [...] }]
 */
export function extractReportsList(data) {
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

  if (Array.isArray(data.findings)) {
    return data.findings;
  }

  return [];
}

export function getSeverityWeight(severity) {
  return SEVERITY_WEIGHT[(severity || "").toLowerCase()] ?? -1;
}

/**
 * Primary: severity (desc). Secondary: vulnerability name (asc).
 */
export function sortReports(reports) {
  if (!Array.isArray(reports)) return [];

  return [...reports].sort((a, b) => {
    const weightDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
    if (weightDiff !== 0) return weightDiff;

    const nameA = (a.vulnerability || a.type || "").toLowerCase();
    const nameB = (b.vulnerability || b.type || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

export function getSeverityBadgeClass(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/50";
    case "low":
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    case "info":
      return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/50";
  }
}

/** Strip redundant "Remote Code Execution" suffix from SSTI titles in the UI. */
export function formatVulnerabilityLabel(name) {
  if (name == null || String(name).trim() === "") return "Finding";
  let label = String(name).trim();
  if (!/ssti/i.test(label)) return label;

  label = label
    .replace(/\s*[-–—|:]\s*remote\s+code\s+execution\s*/gi, "")
    .replace(/\s*\(\s*remote\s+code\s+execution\s*\)\s*/gi, " ")
    .replace(/\s+remote\s+code\s+execution\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—|:]\s*$/g, "")
    .trim();

  return label || "Finding";
}

const FINDING_HEADER_KEYS = new Set([
  "vulnerability",
  "type",
  "name",
  "title",
  "severity",
  "id",
]);

const FINDING_FIELD_ORDER = [
  "summary",
  "description",
  "url",
  "method",
  "parameter",
  "location",
  "payload",
  "evidence",
  "attack_scenario",
  "Attack Scenario",
  "steps_to_reproduce",
  "stepsToReproduce",
  "root_cause_analysis",
  "Root Cause Analysis",
  "impact",
  "business_impact",
  "recommendation",
  "remediation",
  "technical_evidence",
  "sessionUsed",
  "bacClass",
  "unauthorizedResponse",
  "dbms",
  "dbmsDetected",
  "indicator",
  "detectedTemplateEngine",
  "exploitationCapability",
  "baselineResponse",
  "probeResponse",
  "sqlmapOutput",
  "ssrfmapOutput",
  "injection_techniques",
  "successful_payloads",
];

export function formatFindingFieldLabel(key) {
  if (!key || typeof key !== "string") return "Field";
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isEmptyFindingValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function shouldSkipFindingField(key, item) {
  if (FINDING_HEADER_KEYS.has(key)) return true;
  if (key === "description" && item.summary && item.summary === item.description) return true;
  if (key === "summary" && item.description && item.summary === item.description && item.summary) {
    return false;
  }
  return false;
}

export function getFindingDisplayFields(item) {
  if (!item || typeof item !== "object") {
    return [{ key: "details", label: "Details", value: item }];
  }

  const keys = Object.keys(item).filter((key) => !shouldSkipFindingField(key, item));
  const ordered = [
    ...FINDING_FIELD_ORDER.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !FINDING_FIELD_ORDER.includes(key)).sort(),
  ];

  return ordered
    .map((key) => ({
      key,
      label: formatFindingFieldLabel(key),
      value: item[key],
    }))
    .filter((entry) => !isEmptyFindingValue(entry.value));
}

export function normalizeReportItem(item) {
  if (item == null) return item;
  if (typeof item === "string") {
    return {
      vulnerability: "Finding",
      type: "Finding",
      summary: item,
      description: item,
    };
  }
  if (typeof item !== "object") return item;

  const rawName = item.vulnerability || item.type || item.name || item.title;
  const displayName = formatVulnerabilityLabel(rawName);

  return {
    ...item,
    type: displayName,
    vulnerability: displayName,
    severity: item.severity ? String(item.severity).toUpperCase() : item.severity,
    summary: item.summary ?? item.description,
    description: item.description ?? item.summary,
    attack_scenario:
      item.attack_scenario ?? item["Attack Scenario"] ?? item.steps_to_reproduce ?? item.stepsToReproduce,
    steps_to_reproduce:
      item.steps_to_reproduce ?? item.stepsToReproduce ?? item.attack_scenario ?? item["Attack Scenario"],
    url: item.url ?? item.location?.url,
    method: item.method ?? item.location?.method,
    parameter: item.parameter ?? item.location?.parameter,
  };
}

export function prepareReportsForDisplay(data) {
  const raw = extractReportsList(data);
  const normalized = raw.map(normalizeReportItem);
  return sortReports(normalized);
}

export const SEVERITY_FILTER_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

export function getVulnerabilityLabel(item) {
  return formatVulnerabilityLabel(item?.vulnerability || item?.type);
}

export function getUniqueVulnerabilityTypes(reports) {
  if (!Array.isArray(reports)) return [];
  const names = new Set();
  for (const item of reports) {
    const label = getVulnerabilityLabel(item);
    if (label && label !== "Finding" && label !== "Vulnerability") names.add(label);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function filterReports(reports, { severity = "", vulnerability = "" }) {
  if (!Array.isArray(reports)) return [];
  const sev = severity.trim().toLowerCase();
  const vuln = vulnerability.trim().toLowerCase();
  return reports.filter((item) => {
    if (sev && (item.severity || "").toLowerCase() !== sev) return false;
    if (vuln && getVulnerabilityLabel(item).toLowerCase() !== vuln) return false;
    return true;
  });
}
