const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export const SCAN_TOOLS = [
  { id: "sqlmap", label: "SQLMap" },
  { id: "sstimap", label: "SSTIMap" },
  { id: "ssrfmap", label: "SSRFMap" },
  { id: "lfi", label: "LFI" },
];

export const FULL_SCAN_TOOLS = SCAN_TOOLS.map((t) => t.id);

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

export function normalizeReportItem(item) {
  if (!item || typeof item !== "object") return item;

  const rawName = item.vulnerability || item.type;
  const displayName = formatVulnerabilityLabel(rawName);

  return {
    ...item,
    type: displayName,
    vulnerability: displayName,
    severity: (item.severity || "").toUpperCase() || undefined,
    summary: item.summary ?? item.description,
    description: item.description ?? item.summary,
    attack_scenario: item.attack_scenario ?? item.steps_to_reproduce,
    steps_to_reproduce: item.steps_to_reproduce ?? item.attack_scenario,
    payload: item.payload,
    evidence: item.evidence,
    impact: item.impact,
    recommendation: item.recommendation,
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
    if (label && label !== "Vulnerability") names.add(label);
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
