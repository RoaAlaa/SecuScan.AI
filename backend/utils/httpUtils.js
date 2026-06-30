/**
 * Parse axios timeout from env. 0 = no timeout (wait indefinitely).
 * Unset env also defaults to 0 for long-running n8n workflows.
 */
function parseRequestTimeout(envValue) {
  if (envValue == null || String(envValue).trim() === "") {
    return 0;
  }

  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

module.exports = {
  parseRequestTimeout,
};
