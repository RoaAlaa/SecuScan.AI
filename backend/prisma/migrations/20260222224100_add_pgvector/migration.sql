-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable: DocumentChunk stores report content chunks with embeddings for RAG retrieval
-- embedding dimension 768 matches nomic-embed-text (Ollama); change if using different model
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "sourceType" TEXT NOT NULL,
    "reportId" TEXT,
    "scanId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: HNSW index for fast approximate nearest neighbor search
CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex: for access control and filtering
CREATE INDEX "DocumentChunk_sourceType_idx" ON "DocumentChunk"("sourceType");
CREATE INDEX "DocumentChunk_scanId_idx" ON "DocumentChunk"("scanId");
CREATE INDEX "DocumentChunk_reportId_idx" ON "DocumentChunk"("reportId");
CREATE INDEX "DocumentChunk_createdAt_idx" ON "DocumentChunk"("createdAt");
