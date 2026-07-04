const prisma = require("../prismaClient");
const { triggerCrawlerWorkflow } = require("./crawlerService");
const { getAllVulnerabilityKeys, getScannerForVulnerability } = require("../config/workflowConfig");
const { triggerVulnerabilityWorkflow } = require("./workflowService");
const {
  saveCrawlerReport,
  saveWorkflowReport,
  checkAndCompleteScan,
} = require("./reportService");
const { enrichWorkflowFindings, isErrorWorkflowStatus } = require("../utils/workflowPayloadUtils");

async function createWorkflowRuns(scanId, vulnerabilityKeys) {
  await prisma.workflowRun.createMany({
    data: vulnerabilityKeys.map((vulnerability) => ({
      scanId,
      vulnerability,
      status: "pending",
    })),
    skipDuplicates: true,
  });
}

async function markWorkflowRunning(scanId, vulnerabilityKey) {
  await prisma.workflowRun.update({
    where: {
      scanId_vulnerability: { scanId, vulnerability: vulnerabilityKey },
    },
    data: { status: "running", startedAt: new Date(), errorMessage: null },
  });
}

async function markWorkflowFailed(scanId, vulnerabilityKey, errorMessage) {
  await prisma.workflowRun.update({
    where: {
      scanId_vulnerability: { scanId, vulnerability: vulnerabilityKey },
    },
    data: {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: errorMessage || "Workflow failed",
    },
  });

  await saveWorkflowReport({
    scanId,
    vulnerabilityKey,
    scanner: vulnerabilityKey,
    status: "FAILED",
    findings: [],
    errorMessage: errorMessage || "Workflow failed",
  });

  await checkAndCompleteScan(scanId);
}

async function markWorkflowCompleted(scanId, vulnerabilityKey, status = "completed") {
  await prisma.workflowRun.updateMany({
    where: { scanId, vulnerability: vulnerabilityKey },
    data: {
      status: status === "failed" ? "failed" : "completed",
      finishedAt: new Date(),
      errorMessage: null,
    },
  });
}

async function executeVulnerabilityWorkflow({ scanId, crawlOutput, vulnerabilityKey }) {
  await markWorkflowRunning(scanId, vulnerabilityKey);

  try {
    const inlinePayload = await triggerVulnerabilityWorkflow({
      scanId,
      crawlOutput,
      vulnerabilityKey,
    });

    if (inlinePayload) {
      const status = inlinePayload.status || "COMPLETE";
      const findings = enrichWorkflowFindings({
        findings: inlinePayload.findings || [],
        status,
        errorMessage: inlinePayload.errorMessage,
        vulnerabilityKey,
        scanner: inlinePayload.scanner || getScannerForVulnerability(vulnerabilityKey),
      });

      await saveWorkflowReport({
        scanId,
        vulnerabilityKey,
        scanner: inlinePayload.scanner || getScannerForVulnerability(vulnerabilityKey),
        status,
        findings,
        totalFound: inlinePayload.total_found ?? findings.length,
        errorMessage: inlinePayload.errorMessage,
        workflowFailed: isErrorWorkflowStatus(status),
      });
    } else {
      const existingReport = await prisma.report.findFirst({
        where: { scanId, type: vulnerabilityKey },
      });

      if (existingReport) {
        console.log(
          `[workflow] ${vulnerabilityKey} returned no inline payload; using report from /api/report callback`
        );
        await markWorkflowCompleted(scanId, vulnerabilityKey);
      } else {
        console.warn(
          `[workflow] ${vulnerabilityKey} returned no inline payload; saving empty report`
        );
        await saveWorkflowReport({
          scanId,
          vulnerabilityKey,
          scanner: getScannerForVulnerability(vulnerabilityKey) || vulnerabilityKey,
          status: "COMPLETE",
          findings: [],
          totalFound: 0,
        });
      }
    }

    const completed = await checkAndCompleteScan(scanId);
    if (!completed) {
      console.warn(`[workflow] Scan ${scanId} not marked completed yet (waiting on other workflows)`);
    }
  } catch (err) {
    await markWorkflowFailed(scanId, vulnerabilityKey, err.message);
  }
}

async function orchestrateScan({
  scanId,
  targetUrl,
  crawlMode,
  credentials,
}) {
  try {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "running" },
    });

    const crawlOutput = await triggerCrawlerWorkflow({ scanId, targetUrl, crawlMode, credentials });
    await continueAfterCrawl({ scanId, crawlOutput });
  } catch (err) {
    console.error(`[orchestrator] Scan ${scanId} failed:`, err.message);
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "failed", finishedAt: new Date() },
    });
  }
}

async function continueAfterCrawl({ scanId, crawlOutput }) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
  });

  if (!scan) {
    const error = new Error("Scan not found");
    error.statusCode = 404;
    throw error;
  }

  const vulnerabilityKeys = Array.isArray(scan.selectedVulnerabilities) && scan.selectedVulnerabilities.length > 0
    ? scan.selectedVulnerabilities
    : getAllVulnerabilityKeys();

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      crawlOutput,
      status: "running",
    },
  });

  await saveCrawlerReport({ scanId, crawlOutput });

  await createWorkflowRuns(scanId, vulnerabilityKeys);

  await Promise.all(
    vulnerabilityKeys.map((vulnerabilityKey) =>
      executeVulnerabilityWorkflow({ scanId, crawlOutput, vulnerabilityKey })
    )
  );
}

module.exports = {
  orchestrateScan,
  continueAfterCrawl,
};
