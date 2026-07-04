const {
  VULNERABILITY_DEFINITIONS,
  resolveVulnerabilityKey,
  getScannerForVulnerability,
} = require("../config/workflowConfig");

const ERROR_STATUSES = new Set([
  "FAILED",
  "SESSION_EXPIRED",
  "SKIPPED",
  "ERROR",
  "ABORTED",
  "STOPPED",
  "INCOMPLETE",
  "CANCELLED",
]);

const SCANNER_TYPO_FIXES = {
  SQLT: "SQLI",
  SQL: "SQLI",
  LF1: "PATH_TRAVERSAL",
  LFI: "PATH_TRAVERSAL",
  SSR: "SSRF",
  SST: "SSTI",
};

function fixLooseJson(text) {
  return text
    .replace(/"\s*([a-zA-Z_]+)\s*\|"/g, '"$1"')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\bjson\s*\n?\s*\{/gi, "{");
}

function tryParseJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const attempts = [trimmed, fixLooseJson(trimmed)];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // continue
    }
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    for (const candidate of [match[0], fixLooseJson(match[0])]) {
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // continue
      }
    }
  }

  return null;
}

function normalizeScannerValue(scanner) {
  if (!scanner || typeof scanner !== "string") return scanner;
  const upper = scanner.trim().toUpperCase();
  return SCANNER_TYPO_FIXES[upper] || upper;
}

function extractFindingsArray(item) {
  if (!item || typeof item !== "object") return [];
  if (Array.isArray(item.findings)) return item.findings;
  if (Array.isArray(item.vulnerabilities)) return item.vulnerabilities;
  if (Array.isArray(item.reports)) return item.reports;
  return [];
}

function extractProseMessage(text, parsedJson) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (parsedJson) {
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart > 0) {
      const prose = trimmed.slice(0, jsonStart).replace(/^json\s*/i, "").trim();
      if (prose) return prose;
    }
  }

  if (!parsedJson && !trimmed.startsWith("{")) {
    return trimmed;
  }

  return null;
}

function normalizeWorkflowPayload(raw, fallbackVulnerabilityKey) {
  if (raw == null) return null;

  let item = raw;
  let proseMessage = null;

  if (typeof raw === "string") {
    proseMessage = raw.trim();
    item = tryParseJson(raw);
    if (!item) {
      return {
        scanner: getScannerForVulnerability(fallbackVulnerabilityKey),
        status: "FAILED",
        findings: [],
        errorMessage: proseMessage,
        total_found: 0,
      };
    }
    proseMessage = extractProseMessage(raw, item) || proseMessage;
  } else if (typeof raw === "object") {
    if (typeof raw.output === "string") {
      proseMessage = extractProseMessage(raw.output, tryParseJson(raw.output));
      const parsedOutput = tryParseJson(raw.output);
      if (parsedOutput && typeof parsedOutput === "object") {
        item = { ...parsedOutput, ...item, output: raw.output };
      }
    }
    if (Array.isArray(raw)) {
      item = raw[0];
    }
  }

  if (!item || typeof item !== "object") return null;

  const scanner = normalizeScannerValue(item.scanner || item.type);
  const status = String(item.status || item.scan_status || "COMPLETE").toUpperCase();
  const findings = extractFindingsArray(item);
  const errorMessage =
    item.errorMessage ||
    item.message ||
    item.reason ||
    proseMessage ||
    (typeof item.output === "string" ? extractProseMessage(item.output, tryParseJson(item.output)) : null);

  return {
    scanId: item.scanId,
    scanner,
    status,
    findings,
    total_found: item.total_found ?? item.totalFound ?? findings.length,
    errorMessage: errorMessage ? String(errorMessage).trim() : null,
  };
}

function extractWorkflowPayload(responseData, fallbackVulnerabilityKey) {
  if (responseData == null) return null;

  const queue = Array.isArray(responseData) ? [...responseData] : [responseData];
  const seen = new Set();

  while (queue.length > 0) {
    const item = queue.shift();
    if (item == null || seen.has(item)) continue;
    if (typeof item === "object") seen.add(item);

    const normalized = normalizeWorkflowPayload(item, fallbackVulnerabilityKey);
    if (normalized && (normalized.findings.length > 0 || normalized.status || normalized.errorMessage)) {
      return normalized;
    }

    if (typeof item === "string") {
      const parsed = normalizeWorkflowPayload(item, fallbackVulnerabilityKey);
      if (parsed) return parsed;
      continue;
    }

    if (typeof item !== "object") continue;

    for (const key of ["json", "body", "data", "result", "output", "text", "message"]) {
      const value = item[key];
      if (typeof value === "string") {
        queue.push(value);
      } else if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

function isErrorWorkflowStatus(status) {
  return ERROR_STATUSES.has(String(status || "").toUpperCase());
}

function enrichWorkflowFindings({ findings, status, errorMessage, vulnerabilityKey, scanner }) {
  const list = Array.isArray(findings) ? [...findings] : [];
  const normalizedStatus = String(status || "COMPLETE").toUpperCase();
  const label =
    VULNERABILITY_DEFINITIONS[vulnerabilityKey]?.label ||
    resolveVulnerabilityKey(scanner) && VULNERABILITY_DEFINITIONS[resolveVulnerabilityKey(scanner)]?.label ||
    scanner ||
    vulnerabilityKey ||
    "Scan";

  const shouldAddNotice =
    errorMessage &&
    list.length === 0 &&
    (isErrorWorkflowStatus(normalizedStatus) || normalizedStatus !== "COMPLETE");

  if (shouldAddNotice) {
    list.push({
      vulnerability: label,
      type: label,
      severity: "INFO",
      summary: `Scan did not complete (${normalizedStatus.replace(/_/g, " ").toLowerCase()})`,
      description: errorMessage,
      workflow_status: normalizedStatus,
      scanner: scanner || getScannerForVulnerability(vulnerabilityKey),
    });
  }

  return list;
}

module.exports = {
  ERROR_STATUSES,
  tryParseJson,
  normalizeWorkflowPayload,
  extractWorkflowPayload,
  isErrorWorkflowStatus,
  enrichWorkflowFindings,
};
