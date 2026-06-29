-- AlterTable
ALTER TABLE "Scan" ADD COLUMN "crawlMode" INTEGER,
ADD COLUMN "crawlOutput" TEXT,
ADD COLUMN "selectedVulnerabilities" JSONB;

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "vulnerability" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowRun_scanId_idx" ON "WorkflowRun"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_scanId_vulnerability_key" ON "WorkflowRun"("scanId", "vulnerability");

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
