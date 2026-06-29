const axios = require("axios");
const {
  getVulnerabilityWebhookUrl,
  getScannerForVulnerability,
} = require("../config/workflowConfig");

function extractWorkflowPayload(responseData) {
  if (!responseData) return null;

  if (Array.isArray(responseData) && responseData.length > 0) {
    const first = responseData[0];
    if (first && typeof first === "object" && Array.isArray(first.findings)) {
      return first;
    }
  }

  if (typeof responseData === "object" && Array.isArray(responseData.findings)) {
    return responseData;
  }

  return null;
}

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
      timeout: Number(process.env.WORKFLOW_TIMEOUT_MS) || 600000,
    });

    console.log(`[workflow] ${scanner || vulnerabilityKey} triggered successfully`);
    return extractWorkflowPayload(response.data);
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
