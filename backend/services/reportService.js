const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");
const { ingestReportForScan } = require("./reportIngestion");
const { notifyScanComplete } = require("./scanNotificationService");
const {
  normalizeReportItem,
  prepareReportsForDisplay,
  sortReports,
  getHighestSeverity,
} = require("../utils/reportUtils");
const { resolveVulnerabilityKey } = require("../config/workflowConfig");
const { isErrorWorkflowStatus } = require("../utils/workflowPayloadUtils");

function getSampleReport() {
  try {
    const filePath = path.join(__dirname, "..", "report.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (_) {
    // ignore
  }
  return null;
}

function isCrawlerReport(report) {
  return report.type === "crawler";
}

async function syncWorkflowRunsFromReports(scanId) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { workflowRuns: true, reports: true },
  });

  if (!scan) return;

  const vulnerabilityReports = scan.reports.filter((r) => !isCrawlerReport(r));

  for (const run of scan.workflowRuns) {
    if (run.status === "completed" || run.status === "failed") continue;

    const hasMatchingReport = vulnerabilityReports.some((report) => {
      const reportKey = resolveVulnerabilityKey(report.type);
      return report.type === run.vulnerability || reportKey === run.vulnerability;
    });

    if (hasMatchingReport) {
      await prisma.workflowRun.updateMany({
        where: { scanId, vulnerability: run.vulnerability },
        data: { status: "completed", finishedAt: new Date(), errorMessage: null },
      });
    }
  }
}

function extractFindingsFromReport(report) {
  if (!report?.details || typeof report.details !== "object") return [];

  const details = report.details;
  if (Array.isArray(details.vulnerabilities)) {
    return details.vulnerabilities;
  }
  if (Array.isArray(details.findings)) {
    return details.findings;
  }
  return [];
}

async function saveCrawlerReport({ scanId, crawlOutput }) {
  return prisma.report.create({
    data: {
      scanId,
      type: "crawler",
      severity: "info",
      details: { crawlOutput, scan_status: "completed" },
    },
  });
}

async function saveWorkflowReport({
  scanId,
  vulnerabilityKey,
  scanner,
  status,
  findings,
  totalFound,
  errorMessage,
  workflowFailed,
}) {
  let resolvedKey =
    resolveVulnerabilityKey(vulnerabilityKey) || resolveVulnerabilityKey(scanner);

  const reportType = resolvedKey || (typeof scanner === "string" ? scanner.toLowerCase() : "scan");
  if (!resolvedKey) {
    resolvedKey = resolveVulnerabilityKey(reportType);
  }

  const normalizedStatus = String(status || "COMPLETE").toUpperCase();
  const failed = workflowFailed ?? isErrorWorkflowStatus(normalizedStatus);
  const normalizedFindings = Array.isArray(findings) ? findings : [];
  const severity =
    getHighestSeverity(normalizedFindings) || (failed ? "unknown" : "info");

  const report = await prisma.report.create({
    data: {
      scanId,
      type: reportType,
      severity,
      details: {
        scanner: scanner || reportType.toUpperCase(),
        status: normalizedStatus,
        total_found: totalFound ?? normalizedFindings.length,
        vulnerabilities: normalizedFindings,
        scan_status: failed ? "failed" : "completed",
        ...(errorMessage ? { errorMessage } : {}),
      },
    },
  });

  if (resolvedKey) {
    await prisma.workflowRun.updateMany({
      where: { scanId, vulnerability: resolvedKey },
      data: {
        status: failed ? "failed" : "completed",
        finishedAt: new Date(),
        errorMessage: errorMessage || null,
      },
    });
  } else {
    console.warn(
      `[report] Could not map scanner "${scanner}" to a workflow run for scan ${scanId}. ` +
        "Use scanner values like BAC, SQLI, SSTI, SSRF, or PATH_TRAVERSAL."
    );
  }

  return report;
}

async function checkAndCompleteScan(scanId) {
  await syncWorkflowRunsFromReports(scanId);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { workflowRuns: true, reports: true },
  });

  if (!scan || scan.status === "completed" || scan.status === "failed") {
    return false;
  }

  const runs = scan.workflowRuns;
  if (runs.length === 0) {
    return false;
  }

  const allFinished = runs.every((run) => run.status === "completed" || run.status === "failed");
  if (!allFinished) {
    const pending = runs
      .filter((run) => run.status !== "completed" && run.status !== "failed")
      .map((run) => `${run.vulnerability}:${run.status}`);
    console.warn(`[scan] Scan ${scanId} still waiting on workflows: ${pending.join(", ")}`);
    return false;
  }

  const allFailed = runs.every((run) => run.status === "failed");
  const finalStatus = allFailed ? "failed" : "completed";

  await prisma.scan.update({
    where: { id: scanId },
    data: { status: finalStatus, finishedAt: new Date() },
  });

  if (finalStatus === "completed") {
    notifyScanComplete(scanId).catch((err) => {
      console.error("[email] Scan-complete notification failed:", err.message);
    });

    try {
      const merged = await buildMergedReportPayload(scanId);
      const reports = await prisma.report.findMany({
        where: { scanId },
        orderBy: { createdAt: "asc" },
      });
      const vulnerabilityReports = reports.filter((r) => !isCrawlerReport(r));
      const latestReport = vulnerabilityReports[vulnerabilityReports.length - 1];

      if (latestReport) {
        const chunkCount = await ingestReportForScan({
          scanId,
          reportId: latestReport.id,
          type: "scan",
          severity: merged.severity,
          details: merged,
        });
        console.log(`[scan] Scan ${scanId} completed; RAG ingested ${chunkCount} chunk(s)`);
      } else {
        console.warn(`[scan] Scan ${scanId} completed but no vulnerability report found for RAG ingestion`);
      }
    } catch (ingestErr) {
      console.error("Report ingestion (RAG) failed on scan completion:", ingestErr.message);
    }
  }

  console.log(`[scan] Scan ${scanId} marked ${finalStatus}`);
  return true;
}

async function buildMergedReportPayload(scanId) {
  const [scan, reports] = await Promise.all([
    prisma.scan.findUnique({
      where: { id: scanId },
      select: { targetUrl: true, finishedAt: true, status: true },
    }),
    prisma.report.findMany({
      where: { scanId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const vulnerabilityReports = reports.filter((r) => !isCrawlerReport(r));
  const allFindings = [];
  const workflowErrors = [];

  for (const report of vulnerabilityReports) {
    allFindings.push(...extractFindingsFromReport(report));
    const details = report.details && typeof report.details === "object" ? report.details : {};
    if (details.errorMessage) {
      workflowErrors.push({
        scanner: details.scanner || report.type,
        status: details.status || "UNKNOWN",
        message: details.errorMessage,
      });
    }
  }

  const vulnerabilities = sortReports(allFindings.map((f) => normalizeReportItem(f)));
  const severity = getHighestSeverity(vulnerabilities) || "unknown";
  const hasSecurityFindings = vulnerabilities.some(
    (item) => String(item.severity || "").toUpperCase() !== "INFO"
  );

  let summary;
  if (workflowErrors.length > 0 && !hasSecurityFindings) {
    summary =
      "No security vulnerabilities were confirmed. Some scanners could not finish — see workflow notices below.";
  } else if (workflowErrors.length > 0) {
    summary = "Scan completed with findings. Some scanners also reported workflow issues.";
  }

  return {
    type: "scan",
    severity,
    scan_status: scan?.status === "failed" ? "failed" : "completed",
    targetUrl: scan?.targetUrl,
    finishedAt: scan?.finishedAt,
    summary,
    workflow_errors: workflowErrors,
    vulnerabilities,
  };
}

async function getReportForScan({ scanId, userId, token }) {
  if (!scanId) {
    const error = new Error("Scan ID required");
    error.statusCode = 400;
    throw error;
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { reports: { orderBy: { createdAt: "asc" } } },
  });

  if (!scan) {
    const error = new Error("Scan not found");
    error.statusCode = 404;
    throw error;
  }

  let allowed = false;

  if (userId && scan.userId === userId) {
    allowed = true;
  }

  if (!allowed && token) {
    const access = await prisma.reportAccess.findFirst({
      where: { scanId, token },
    });

    if (access && new Date() < access.expiresAt) {
      allowed = true;
    }
  }

  if (!allowed) {
    const error = new Error("You do not have access to this report");
    error.statusCode = 403;
    throw error;
  }

  const vulnerabilityReports = (scan.reports || []).filter((r) => !isCrawlerReport(r));

  if (vulnerabilityReports.length > 0) {
    const merged = await buildMergedReportPayload(scanId);

    if (merged.vulnerabilities.length > 0) {
      return merged;
    }

    const latest = vulnerabilityReports[vulnerabilityReports.length - 1];
    let base = {};
    if (latest.details && typeof latest.details === "object") {
      base = latest.details;
    }

    const normalized = {
      ...base,
      type: latest.type,
      severity: latest.severity,
      scan_status: base.scan_status ?? (scan.status === "failed" ? "failed" : "completed"),
      vulnerabilities: [],
    };

    return normalized;
  }

  if (scan.status === "running" || scan.status === "pending") {
    const error = new Error("Report not ready yet");
    error.statusCode = 404;
    throw error;
  }

  const sample = getSampleReport();
  if (sample) {
    return sample;
  }

  const error = new Error("Report not ready yet");
  error.statusCode = 404;
  throw error;
}

module.exports = {
  saveCrawlerReport,
  saveWorkflowReport,
  checkAndCompleteScan,
  buildMergedReportPayload,
  getReportForScan,
};
