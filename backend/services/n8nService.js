const axios = require("axios");

async function triggerScanWorkflow({ scanId, targetUrl, email, scans }) {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    console.log("[n8n] Skipped: N8N_WEBHOOK_URL not set");
    return;
  }

  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5001}`;
  const callbackUrl = `${backendUrl.replace(/\/$/, "")}/api/report`;

  const payload = {
    scanId,
    url: targetUrl,
    targetUrl,
    callbackUrl,
    scans: Array.isArray(scans) && scans.length > 0 ? scans : ["sqlmap", "sstimap", "ssrfmap", "lfi"],
    ...(email && { email }),
    httpRequest: {
      method: "GET",
      url: targetUrl,
      headers: {},
      body: null,
      cookies: {},
    },
  };

  console.log("[n8n] Triggering workflow:", webhookUrl);

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
    console.log("[n8n] Workflow triggered successfully");
  } catch (err) {
    console.error("[n8n] Failed to trigger workflow:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error("[n8n] Is n8n running? Try: n8n start (or ensure n8n is listening on port 5678)");
    }
  }
}

module.exports = {
  triggerScanWorkflow,
};
