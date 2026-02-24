const prisma = require("../prismaClient");
const { ingestReportForScan } = require("../services/reportIngestion");
const { getReportForScan } = require("../services/reportService");

/**
 * Save a report (e.g. from n8n when scan completes) and run RAG ingestion.
 * Body: { scanId, type, severity, details }
 */
exports.saveReport = async (req, res) => {
  try {
    const { scanId, type, severity, details } = req.body;

    if (!scanId || !details || typeof details !== "object") {
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

    const chunkCount = await ingestReportForScan({
      scanId,
      reportId: report.id,
      type: report.type,
      severity: report.severity,
      details: report.details,
    });

    res.status(201).json({
      reportId: report.id,
      message: "Report saved",
      chunksIngested: chunkCount,
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
