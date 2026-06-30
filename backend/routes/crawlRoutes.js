const router = require("express").Router();
const { continueAfterCrawl } = require("../services/scanOrchestrator");
const { findScanByCallbackToken } = require("../services/scanService");
const prisma = require("../prismaClient");

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
    const token = req.query.token || req.body.token;
    const { scanId, crawlOutput } = req.body;

    let scan = null;
    if (scanId) {
      scan = await prisma.scan.findUnique({ where: { id: scanId } });
    } else if (token) {
      scan = await findScanByCallbackToken(token);
    }

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const normalizedOutput = normalizeCrawlOutput(crawlOutput);
    if (!normalizedOutput) {
      return res.status(400).json({ error: "crawlOutput is required and must contain text or pages" });
    }

    await continueAfterCrawl({ scanId: scan.id, crawlOutput: normalizedOutput });

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
