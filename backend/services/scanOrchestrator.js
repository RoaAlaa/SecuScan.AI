const prisma = require("../prismaClient");
const { runCrawler } = require("./crawlerService");
const { triggerVulnerabilityWorkflow } = require("./workflowService");
const {
  saveCrawlerReport,
  saveWorkflowReport,
  checkAndCompleteScan,
} = require("./reportService");

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

async function executeVulnerabilityWorkflow({ scanId, crawlOutput, vulnerabilityKey }) {
  await markWorkflowRunning(scanId, vulnerabilityKey);

  try {
    const inlinePayload = await triggerVulnerabilityWorkflow({
      scanId,
      crawlOutput,
      vulnerabilityKey,
    });

    if (inlinePayload) {
      await saveWorkflowReport({
        scanId,
        vulnerabilityKey,
        scanner: inlinePayload.scanner,
        status: inlinePayload.status || "COMPLETE",
        findings: inlinePayload.findings || [],
        totalFound: inlinePayload.total_found,
      });
      await checkAndCompleteScan(scanId);
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
  vulnerabilityKeys,
}) {
  try {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "running" },
    });

    const crawlOutput = await runCrawler({ scanId, targetUrl, crawlMode, credentials });

    await prisma.scan.update({
      where: { id: scanId },
      data: { crawlOutput },
    });

    await saveCrawlerReport({ scanId, crawlOutput });

    await createWorkflowRuns(scanId, vulnerabilityKeys);

    await Promise.all(
      vulnerabilityKeys.map((vulnerabilityKey) =>
        executeVulnerabilityWorkflow({ scanId, crawlOutput, vulnerabilityKey })
      )
    );
  } catch (err) {
    console.error(`[orchestrator] Scan ${scanId} failed:`, err.message);
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "failed", finishedAt: new Date() },
    });
  }
}

module.exports = {
  orchestrateScan,
};
