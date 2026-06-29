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

function resolveVulnerabilityKey(input) {
  if (!input || typeof input !== "string") return null;
  const normalized = input.trim().toLowerCase().replace(/-/g, "_");
  if (VULNERABILITY_DEFINITIONS[normalized]) return normalized;
  if (LEGACY_SCAN_ALIASES[normalized]) return LEGACY_SCAN_ALIASES[normalized];
  const fromScanner = SCANNER_TO_VULNERABILITY[input.trim().toUpperCase()];
  return fromScanner || null;
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
