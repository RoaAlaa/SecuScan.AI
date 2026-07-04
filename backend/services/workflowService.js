const axios = require("axios");
const {
  getVulnerabilityWebhookUrl,
  getScannerForVulnerability,
} = require("../config/workflowConfig");
const { parseRequestTimeout } = require("../utils/httpUtils");
const { extractWorkflowPayload } = require("../utils/workflowPayloadUtils");

async function triggerVulnerabilityWorkflow({ scanId, crawlOutput, vulnerabilityKey }) {
  const webhookUrl = getVulnerabilityWebhookUrl(vulnerabilityKey);
  if (!webhookUrl) {
    throw new Error(`Webhook URL not configured for vulnerability: ${vulnerabilityKey}`);
  }

  const payload = {
    scanId,
    crawlOutput,
    crawlerMessage: crawlOutput,
  };

  const scanner = getScannerForVulnerability(vulnerabilityKey);
  console.log(`[workflow] Triggering ${scanner || vulnerabilityKey}:`, webhookUrl);

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: parseRequestTimeout(process.env.WORKFLOW_TIMEOUT_MS),
    });

    console.log(`[workflow] ${scanner || vulnerabilityKey} triggered successfully`);
    return extractWorkflowPayload(response.data, vulnerabilityKey);
  } catch (err) {
    const message = err.response?.data?.message || err.message || "Workflow trigger failed";
    console.error(`[workflow] ${scanner || vulnerabilityKey} failed:`, message);
    throw new Error(message);
  }
}

module.exports = {
  extractWorkflowPayload,
  triggerVulnerabilityWorkflow,
};
