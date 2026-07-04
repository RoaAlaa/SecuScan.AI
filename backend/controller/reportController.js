const {
  saveWorkflowReport,
  checkAndCompleteScan,
  getReportForScan,
} = require("../services/reportService");
const {
  extractReportsList,
  prepareReportsForDisplay,
  isWorkflowReportPayload,
} = require("../utils/reportUtils");
const { resolveVulnerabilityKey, getScannerForVulnerability } = require("../config/workflowConfig");
const {
  normalizeWorkflowPayload,
  enrichWorkflowFindings,
  isErrorWorkflowStatus,
} = require("../utils/workflowPayloadUtils");
const prisma = require("../prismaClient");

async function handleLegacyReportSave(body) {
  let { scanId, type, severity, details } = body;

  if (typeof details === "string") {
    try {
      details = details.trim() ? JSON.parse(details) : {};
    } catch (_) {
      const error = new Error("details must be valid JSON");
      error.statusCode = 400;
      throw error;
    }
  }

  if (details == null || typeof details !== "object") {
    details = {};
  }
  if (Array.isArray(details)) {
    const first = details[0];
    details = first && typeof first === "object" && first.details != null
      ? (typeof first.details === "string" ? JSON.parse(first.details) : first.details)
      : {};
  }
  if (body.scan_status != null && details.scan_status == null) {
    details = { ...details, scan_status: body.scan_status };
  }
  if (Array.isArray(body.vulnerabilities) && !Array.isArray(details.vulnerabilities)) {
    details = { ...details, vulnerabilities: prepareReportsForDisplay({ vulnerabilities: body.vulnerabilities }) };
  }
  if (Array.isArray(body.reports) && !Array.isArray(details.vulnerabilities)) {
    details = {
      ...details,
      vulnerabilities: prepareReportsForDisplay({ reports: body.reports }),
      scan_status: details.scan_status ?? body.scan_status ?? "completed",
    };
  }
  if (Array.isArray(details.vulnerabilities)) {
    details = {
      ...details,
      vulnerabilities: prepareReportsForDisplay({ vulnerabilities: details.vulnerabilities }),
    };
  }

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    const error = new Error("Scan not found");
    error.statusCode = 404;
    throw error;
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

  const { notifyScanComplete } = require("../services/scanNotificationService");
  notifyScanComplete(scanId).catch((err) => {
    console.error("[email] Scan-complete notification failed; report was saved:", err.message);
  });

  let chunkCount = 0;
  try {
    const { ingestReportForScan } = require("../services/reportIngestion");
    chunkCount = await ingestReportForScan({
      scanId,
      reportId: report.id,
      type: report.type,
      severity: report.severity,
      details: report.details,
    });
  } catch (ingestErr) {
    console.error("Report ingestion (RAG) failed; report was saved:", ingestErr.message);
  }

  return { reportId: report.id, chunkCount };
}

exports.saveReport = async (req, res) => {
  try {
    const rawBody = req.body;
    let body = rawBody;

    if (Array.isArray(body) && body.length > 0) {
      const nestedReports = extractReportsList(body);
      if (nestedReports.length > 0) {
        const vulnerabilities = prepareReportsForDisplay(body);
        body = {
          scanId: body[0]?.scanId ?? rawBody?.scanId,
          type: "scan",
          severity: vulnerabilities[0]?.severity?.toLowerCase() || "unknown",
          details: { vulnerabilities, scan_status: "completed" },
        };
      } else if (body[0]?.output) {
        return res.status(400).json({ error: "Crawler output must be handled by the orchestrator, not /api/report" });
      } else {
        body = body[0];
      }
    }

    body = body || {};

    if (isWorkflowReportPayload(body)) {
      const { scanId, scanner, status, total_found: totalFound, findings } = body;

      const scan = await prisma.scan.findUnique({ where: { id: scanId } });
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      const vulnerabilityKey = resolveVulnerabilityKey(scanner);
      const report = await saveWorkflowReport({
        scanId,
        vulnerabilityKey,
        scanner,
        status: status || "COMPLETE",
        findings: findings || [],
        totalFound,
      });

      const completed = await checkAndCompleteScan(scanId);

      return res.status(201).json({
        reportId: report.id,
        message: "Workflow report saved",
        scanCompleted: completed,
      });
    }

    const { scanId } = body;
    if (!scanId) {
      return res.status(400).json({ error: "scanId is required" });
    }

    const result = await handleLegacyReportSave(body);

    res.status(201).json({
      reportId: result.reportId,
      message: "Report saved",
      chunksIngested: result.chunkCount,
      ...(result.chunkCount === 0 && {
        warning: "RAG ingestion skipped. Is Ollama running (e.g. ollama serve) with the embedding model pulled?",
      }),
    });
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
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
