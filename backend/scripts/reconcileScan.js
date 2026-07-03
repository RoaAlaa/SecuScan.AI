#!/usr/bin/env node
/**
 * Mark a stuck scan completed when reports exist but workflow runs were not finalized.
 * Usage: node scripts/reconcileScan.js <scanId>
 */

const { checkAndCompleteScan } = require("../services/reportService");
const prisma = require("../prismaClient");

async function main() {
  const scanId = process.argv[2];
  if (!scanId) {
    console.error("Usage: node scripts/reconcileScan.js <scanId>");
    process.exit(1);
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { workflowRuns: true, reports: true },
  });

  if (!scan) {
    console.error("Scan not found:", scanId);
    process.exit(1);
  }

  console.log("Before:", {
    status: scan.status,
    workflowRuns: scan.workflowRuns.map((r) => ({ v: r.vulnerability, status: r.status })),
    reports: scan.reports.map((r) => r.type),
  });

  const completed = await checkAndCompleteScan(scanId);

  const updated = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { workflowRuns: true },
  });

  console.log("After:", {
    status: updated.status,
    workflowRuns: updated.workflowRuns.map((r) => ({ v: r.vulnerability, status: r.status })),
    scanCompleted: completed,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
