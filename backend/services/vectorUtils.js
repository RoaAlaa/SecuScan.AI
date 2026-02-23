/**
 * Vector operations for RAG: embeddings via Ollama, pgvector store/search.
 * Requires: Ollama running with nomic-embed-text (768 dimensions).
 */

const crypto = require("crypto");
const prisma = require("../prismaClient");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";
const EMBEDDING_DIM = 768;

/**
 * Get embedding vector for text via Ollama.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Array of 768 floats
 */
async function getEmbedding(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required for embedding");
  }

  // Truncate very long text (Ollama has context limits)
  const MAX_LENGTH = 8000; // Adjust based on model
  const truncated = text.length > MAX_LENGTH 
    ? text.substring(0, MAX_LENGTH) 
    : text;

  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      model: EMBEDDING_MODEL, 
      prompt: truncated 
    }),
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.text();
    } catch {
      err = "Unknown error";
    }
    throw new Error(`Ollama embedding failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const embedding = data.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `Unexpected embedding shape: expected ${EMBEDDING_DIM}, got ${embedding?.length ?? 0}`
    );
  }

  return embedding;
}

function embeddingToVectorLiteral(embedding) {
  return "[" + embedding.join(",") + "]";
}

/**
 * Store a single document chunk with its embedding.
 * @param {Object} params
 * @param {string} params.content - Chunk text
 * @param {string} params.sourceType - "knowledge" or "report"
 * @param {string} [params.reportId]
 * @param {string} [params.scanId]
 * @param {Object} [params.metadata]
 * @param {number[]} [params.embedding] - If omitted, computed via getEmbedding(content)
 * @returns {Promise<string>} - Inserted chunk id
 */
async function storeChunk({ content, sourceType, reportId, scanId, metadata, embedding }) {
  if (!content || !sourceType) {
    throw new Error("content and sourceType are required");
  }
  if (!["knowledge", "report"].includes(sourceType)) {
    throw new Error('sourceType must be "knowledge" or "report"');
  }

  // Validate report chunks have scanId (security requirement)
  if (sourceType === "report" && !scanId) {
    throw new Error("report chunks require scanId for access control");
  }

  const vec = embedding ?? (await getEmbedding(content));
  const vectorStr = embeddingToVectorLiteral(vec);
  const id = crypto.randomUUID();
  const metaJson = metadata ? JSON.stringify(metadata) : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "DocumentChunk" (id, content, embedding, "sourceType", "reportId", "scanId", metadata)
     VALUES ($1, $2, $3::vector, $4, $5, $6, $7::jsonb)`,
    id,
    content,
    vectorStr,
    sourceType,
    reportId ?? null,
    scanId ?? null,
    metaJson
  );

  return id;
}

/**
 * Store multiple document chunks. Each chunk gets its own embedding.
 * @param {Array<{content: string, sourceType: string, reportId?: string, scanId?: string, metadata?: Object}>} chunks
 * @returns {Promise<string[]>} - Array of inserted chunk ids
 */
async function storeChunks(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  // Sequential to avoid heap OOM (parallel embedding + DB holds too much in memory)
  const ids = [];
  for (const chunk of chunks) {
    const id = await storeChunk(chunk);
    ids.push(id);
  }
  return ids;
}

/**
 * Find similar chunks by embedding (cosine distance).
 * @param {number[]} queryEmbedding - Query vector
 * @param {Object} [options]
 * @param {number} [options.limit=5]
 * @param {number|null} [options.minSimilarity] - Min similarity (0-1). Omit for top-k only.
 * @param {string} [options.sourceType] - Filter by "knowledge" or "report"
 * @param {string} [options.scanId] - Filter by scan (for access control)
 * @param {string} [options.reportId] - Filter by report
 * @returns {Promise<Array<{id, content, sourceType, reportId, scanId, metadata, distance, similarity}>>}
 */
async function findSimilarChunks(queryEmbedding, options = {}) {
  const { 
    limit = 5, 
    minSimilarity = null, 
    sourceType, 
    scanId, 
    reportId 
  } = options;
  
  const vectorStr = embeddingToVectorLiteral(queryEmbedding);

  const conditions = [];
  const params = [vectorStr];
  let paramIndex = 2;

  if (sourceType) {
    conditions.push(`"sourceType" = $${paramIndex}`);
    params.push(sourceType);
    paramIndex++;
  }
  if (scanId) {
    conditions.push(`"scanId" = $${paramIndex}`);
    params.push(scanId);
    paramIndex++;
  }
  if (reportId) {
    conditions.push(`"reportId" = $${paramIndex}`);
    params.push(reportId);
    paramIndex++;
  }

  const filterClause = conditions.length ? "AND " + conditions.join(" AND ") : "";
  const similarityClause = minSimilarity != null
    ? `AND (1 - (embedding <=> $1::vector)) >= $${paramIndex}`
    : "";
  if (minSimilarity != null) {
    params.push(minSimilarity);
    paramIndex++;
  }
  params.push(limit);

  const sql = `
    SELECT id, content, "sourceType", "reportId", "scanId", metadata,
           (embedding <=> $1::vector) AS distance,
           (1 - (embedding <=> $1::vector)) AS similarity
    FROM "DocumentChunk"
    WHERE 1=1 ${similarityClause} ${filterClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${paramIndex}
  `;

  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  return rows;
}

/**
 * Delete all chunks belonging to a scan.
 * @param {string} scanId
 * @returns {Promise<number>} - Number of deleted rows
 */
async function deleteChunksByScan(scanId) {
  if (!scanId) {
    throw new Error("scanId is required");
  }
  
  // Only delete report chunks (safety - never delete knowledge)
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "DocumentChunk" 
     WHERE "scanId" = $1 AND "sourceType" = 'report'`,
    scanId
  );
  
  return result;
}

/**
 * Get chunk stats for a scan (report chunks only).
 * @param {string} scanId
 * @returns {Promise<Object>}
 */
async function getChunkStats(scanId) {
  if (!scanId) {
    throw new Error("scanId is required");
  }
  const sql = `
    SELECT COUNT(*)::int as total
    FROM "DocumentChunk"
    WHERE "scanId" = $1 AND "sourceType" = 'report'
  `;
  const result = await prisma.$queryRawUnsafe(sql, scanId);
  return result[0];
}

module.exports = {
  getEmbedding,
  storeChunk,
  storeChunks,
  findSimilarChunks,
  deleteChunksByScan,
  getChunkStats, // Optional export
  EMBEDDING_DIM,
};