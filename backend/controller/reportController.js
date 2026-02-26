const prisma = require("../prismaClient");
const { ingestReportForScan } = require("../services/reportIngestion");
const { getReportForScan } = require("../services/reportService");

/**
 * Save a report (e.g. from n8n when scan completes) and run RAG ingestion.
 * Body: { scanId, type, severity, details }
 */
exports.saveReport = async (req, res) => {
  try {
    const body = req.body || {};
    let { scanId, type, severity, details } = body;

    if (!scanId) {
      return res.status(400).json({
        error: "scanId and details (object) are required",
      });
    }

    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch (_) {
        return res.status(400).json({ error: "details must be valid JSON" });
      }
    }

    if (!details || typeof details !== "object" || Array.isArray(details)) {
      return res.status(400).json({
        error: "scanId and details (object) are required",
      });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
    });
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const report = await prisma.report.create({
      data: {
        scanId,
        type: type || "scan",
        severity: severity || "unknown",
        details,
      },
    });

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "completed", finishedAt: new Date() },
    });

    let chunkCount = 0;
    try {
      chunkCount = await ingestReportForScan({
        scanId,
        reportId: report.id,
        type: report.type,
        severity: report.severity,
        details: report.details,
      });
    } catch (ingestErr) {
      console.error("Report ingestion (RAG) failed; report was saved:", ingestErr.message);
      // Report is already saved; ingestion is best-effort (e.g. Ollama down)
    }

    res.status(201).json({
      reportId: report.id,
      message: "Report saved",
      chunksIngested: chunkCount,
      ...(chunkCount === 0 && { warning: "RAG ingestion skipped. Is Ollama running (e.g. ollama serve) with the embedding model pulled?" }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save report" });
  }
};

exports.getReport = async (req, res) => {
  try {
    const { scanId } = req.params;
    const { token } = req.query;
    const userId = req.userId || null;

    const report = await getReportForScan({ scanId, userId, token });
    return res.json(report);
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to load report" });
  }
};
