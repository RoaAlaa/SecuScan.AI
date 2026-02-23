/**
 * Text chunking for RAG ingestion.
 * Splits content into overlapping chunks so embeddings capture context.
 */

const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_OVERLAP = 100;

/**
 * Split text into chunks of roughly chunkSize characters with overlap.
 * @param {string} text - Raw text
 * @param {Object} [options]
 * @param {number} [options.chunkSize=600]
 * @param {number} [options.overlap=100]
 * @returns {string[]} - Array of chunk strings
 */
function splitIntoChunks(text, options = {}) {
  const { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = options;
  if (!text || typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = start + chunkSize;
    if (end < trimmed.length) {
      // Try to break at sentence or newline
      const slice = trimmed.substring(start, end);
      const lastNewline = slice.lastIndexOf("\n");
      const lastPeriod = slice.lastIndexOf(". ");
      const breakAt = Math.max(lastNewline, lastPeriod);
      if (breakAt > chunkSize / 2) {
        end = start + breakAt + 1;
      }
    } else {
      end = trimmed.length;
    }

    const chunk = trimmed.substring(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    // If we've reached or passed the end, stop to avoid infinite loops
    if (end >= trimmed.length) {
      break;
    }

    // Advance with overlap; ensure we always move forward
    start = end - overlap;
    if (start <= 0) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Split markdown content: prefer splitting by ## headers, then by chunk size.
 * @param {string} md - Markdown text
 * @param {Object} [options] - Same as splitIntoChunks
 * @returns {string[]}
 */
function splitMarkdownIntoChunks(md, options = {}) {
  if (!md || typeof md !== "string") return [];
  const trimmed = md.trim();
  if (!trimmed) return [];

  const { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = options;

  // Split by ## or ### headers first
  const sections = trimmed.split(/(?=^##\s)/m).filter(Boolean);
  const chunks = [];

  for (const section of sections) {
    const sectionTrimmed = section.trim();
    if (sectionTrimmed.length <= chunkSize) {
      if (sectionTrimmed.length > 0) chunks.push(sectionTrimmed);
    } else {
      chunks.push(...splitIntoChunks(sectionTrimmed, { chunkSize, overlap }));
    }
  }

  return chunks.filter(Boolean);
}

module.exports = {
  splitIntoChunks,
  splitMarkdownIntoChunks,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_OVERLAP,
};
