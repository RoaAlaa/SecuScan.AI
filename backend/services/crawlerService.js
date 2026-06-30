const axios = require("axios");
const { getCrawlerWebhookUrl } = require("../config/workflowConfig");

function formatCredential(label, cred) {
  const username = cred?.username?.trim() || "";
  const password = cred?.password ?? "";
  return `${label}:${username}:${password}`;
}

function buildCrawlerPrompt({ targetUrl, crawlMode, credentials = {} }) {
  const url = targetUrl.trim();
  const mode = Number(crawlMode) || 1;

  if (mode === 3) {
    const parts = [
      formatCredential("admin", credentials.admin),
      formatCredential("user1", credentials.user1),
      formatCredential("user2", credentials.user2),
    ];
    return `crawler mode ${url} ${parts.join(" ")}`.trim();
  }

  if (mode === 2) {
    const parts = [
      formatCredential("user1", credentials.user1),
      formatCredential("user2", credentials.user2),
    ];
    return `crawler mode ${url} ${parts.join(" ")}`.trim();
  }

  return `crawler mode ${url}`;
}

function extractCrawlOutput(responseData) {
  if (typeof responseData === "string") {
    return responseData.trim() || null;
  }

  if (Array.isArray(responseData) && responseData.length > 0) {
    const first = responseData[0];
    if (typeof first === "string" && first.trim()) {
      return first.trim();
    }
    if (first && typeof first === "object") {
      const output =
        first.crawlOutput ??
        first.output ??
        first.message ??
        first.text ??
        first.crawlerMessage;
      if (typeof output === "string" && output.trim()) {
        return output.trim();
      }
      if (Array.isArray(first.pages) && first.pages.length > 0) {
        return first.pages.map((page) => (typeof page === "string" ? page : JSON.stringify(page))).join("\n");
      }
    }
  }

  if (responseData && typeof responseData === "object") {
    const output =
      responseData.crawlOutput ??
      responseData.output ??
      responseData.message ??
      responseData.text ??
      responseData.crawlerMessage;
    if (typeof output === "string" && output.trim()) {
      return output.trim();
    }
    if (Array.isArray(responseData.pages) && responseData.pages.length > 0) {
      return responseData.pages.map((page) => (typeof page === "string" ? page : JSON.stringify(page))).join("\n");
    }
  }

  return null;
}

async function triggerCrawlerWorkflow({ scanId, targetUrl, crawlMode, credentials }) {
  const webhookUrl = getCrawlerWebhookUrl();
  if (!webhookUrl) {
    throw new Error("CRAWLER_WEBHOOK_URL is not configured");
  }

  const prompt = buildCrawlerPrompt({ targetUrl, crawlMode, credentials });

  console.log("[crawler] Triggering workflow:", webhookUrl);

  try {
    const response = await axios.post(
      webhookUrl,
      { scanId, prompt, targetUrl, crawlMode },
      {
        headers: { "Content-Type": "application/json" },
        timeout: Number(process.env.CRAWLER_TIMEOUT_MS) || 300000,
      }
    );

    const crawlOutput = extractCrawlOutput(response.data);
    if (!crawlOutput) {
      throw new Error("Crawler workflow returned no text output");
    }

    console.log("[crawler] Crawler workflow completed successfully");
    return crawlOutput;
  } catch (err) {
    const message = err.response?.data?.message || err.message || "Crawler workflow failed";
    console.error("[crawler] Failed:", message);
    throw new Error(message);
  }
}

module.exports = {
  buildCrawlerPrompt,
  extractCrawlOutput,
  triggerCrawlerWorkflow,
};
