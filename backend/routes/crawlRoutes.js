const router = require("express").Router();
const { handleCrawlerCallback } = require("../services/scanOrchestrator");

function normalizeCrawlOutput(input) {
  if (typeof input === "string" && input.trim()) {
    return input.trim();
  }

  if (Array.isArray(input)) {
    return input
      .map((page) => (typeof page === "string" ? page : JSON.stringify(page)))
      .filter(Boolean)
      .join("\n");
  }

  if (input && typeof input === "object") {
    const output = input.output ?? input.message ?? input.text ?? input.crawlerMessage;
    if (typeof output === "string" && output.trim()) {
      return output.trim();
    }
    if (Array.isArray(input.pages)) {
      return input.pages
        .map((page) => (typeof page === "string" ? page : JSON.stringify(page)))
        .filter(Boolean)
        .join("\n");
    }
  }

  return null;
}

router.post("/output", async (req, res) => {
  try {
    const scanId = req.body.scanId || req.query.scanId;
    const { crawlOutput } = req.body;

    if (!scanId) {
      return res.status(400).json({ error: "scanId is required" });
    }

    const normalizedOutput = normalizeCrawlOutput(crawlOutput);
    if (!normalizedOutput) {
      return res.status(400).json({ error: "crawlOutput is required and must contain text or pages" });
    }

    await handleCrawlerCallback({ scanId, crawlOutput: normalizedOutput });

    res.status(200).json({ message: "Crawler output received" });
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to handle crawler output" });
  }
});

module.exports = router;
