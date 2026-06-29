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
  if (Array.isArray(responseData) && responseData.length > 0) {
    const output = responseData[0]?.output;
    if (typeof output === "string" && output.trim()) {
      return output;
    }
  }

  if (responseData && typeof responseData === "object" && typeof responseData.output === "string") {
    return responseData.output;
  }

  return null;
}

async function runCrawler({ targetUrl, crawlMode, credentials }) {
  const webhookUrl = getCrawlerWebhookUrl();
  if (!webhookUrl) {
    throw new Error("CRAWLER_WEBHOOK_URL is not configured");
  }

  const prompt = buildCrawlerPrompt({ targetUrl, crawlMode, credentials });
  console.log("[crawler] Triggering workflow:", webhookUrl);

  try {
    const response = await axios.post(
      webhookUrl,
      { prompt, targetUrl, crawlMode },
      {
        headers: { "Content-Type": "application/json" },
        timeout: Number(process.env.CRAWLER_TIMEOUT_MS) || 300000,
      }
    );

    const crawlOutput = extractCrawlOutput(response.data);
    if (!crawlOutput) {
      throw new Error("Crawler workflow did not return crawl output");
    }

    console.log("[crawler] Crawl completed successfully");
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
  runCrawler,
};
