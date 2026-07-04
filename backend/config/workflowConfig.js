const VULNERABILITY_DEFINITIONS = {
  sqli: {
    key: "sqli",
    label: "SQL Injection",
    scanner: "SQLI",
    webhookEnv: "SQLI_WEBHOOK_URL",
  },
  ssti: {
    key: "ssti",
    label: "SSTI",
    scanner: "SSTI",
    webhookEnv: "SSTI_WEBHOOK_URL",
  },
  ssrf: {
    key: "ssrf",
    label: "SSRF",
    scanner: "SSRF",
    webhookEnv: "SSRF_WEBHOOK_URL",
  },
  bac: {
    key: "bac",
    label: "Broken Access Control",
    scanner: "BAC",
    webhookEnv: "BAC_WEBHOOK_URL",
  },
  path_traversal: {
    key: "path_traversal",
    label: "Path Traversal",
    scanner: "PATH_TRAVERSAL",
    webhookEnv: "LFI_WEBHOOK_URL",
  },
};

const LEGACY_SCAN_ALIASES = {
  sqlmap: "sqli",
  sstimap: "ssti",
  ssrfmap: "ssrf",
  lfi: "path_traversal",
  path_traversal: "path_traversal",
  pathtraversal: "path_traversal",
};

const SCANNER_TO_VULNERABILITY = Object.fromEntries(
  Object.values(VULNERABILITY_DEFINITIONS).map((def) => [def.scanner, def.key])
);

function getCrawlerWebhookUrl() {
  return (process.env.CRAWLER_WEBHOOK_URL || "").trim();
}

function getVulnerabilityWebhookUrl(vulnerabilityKey) {
  const def = VULNERABILITY_DEFINITIONS[vulnerabilityKey];
  if (!def) return "";
  return (process.env[def.webhookEnv] || "").trim();
}

function getVulnerabilityWebhookMap() {
  const map = {};
  for (const [key, def] of Object.entries(VULNERABILITY_DEFINITIONS)) {
    map[key] = getVulnerabilityWebhookUrl(key);
  }
  return map;
}

const LABEL_ALIASES = {
  sqlt: "sqli",
  sql_injection: "sqli",
  sqlinject: "sqli",
  sqlmap: "sqli",
  server_side_template_injection: "ssti",
  template_injection: "ssti",
  sstimap: "ssti",
  server_side_request_forgery: "ssrf",
  ssrfmap: "ssrf",
  broken_access_control: "bac",
  access_control: "bac",
  idor: "bac",
  path_traversal: "path_traversal",
  directory_traversal: "path_traversal",
  pathtraversal: "path_traversal",
  lfi: "path_traversal",
  local_file_inclusion: "path_traversal",
};

function resolveVulnerabilityKey(input) {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase().replace(/[\s-]+/g, "_");

  if (VULNERABILITY_DEFINITIONS[normalized]) return normalized;
  if (LEGACY_SCAN_ALIASES[normalized]) return LEGACY_SCAN_ALIASES[normalized];
  if (LABEL_ALIASES[normalized]) return LABEL_ALIASES[normalized];

  const fromScanner = SCANNER_TO_VULNERABILITY[trimmed.toUpperCase()];
  if (fromScanner) return fromScanner;

  for (const def of Object.values(VULNERABILITY_DEFINITIONS)) {
    const labelNorm = def.label.toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === labelNorm || normalized.includes(labelNorm) || labelNorm.includes(normalized)) {
      return def.key;
    }
  }

  return null;
}

function getAllVulnerabilityKeys() {
  return Object.keys(VULNERABILITY_DEFINITIONS);
}

function getScannerForVulnerability(vulnerabilityKey) {
  return VULNERABILITY_DEFINITIONS[vulnerabilityKey]?.scanner || null;
}

module.exports = {
  VULNERABILITY_DEFINITIONS,
  LEGACY_SCAN_ALIASES,
  SCANNER_TO_VULNERABILITY,
  getCrawlerWebhookUrl,
  getVulnerabilityWebhookUrl,
  getVulnerabilityWebhookMap,
  resolveVulnerabilityKey,
  getAllVulnerabilityKeys,
  getScannerForVulnerability,
};
