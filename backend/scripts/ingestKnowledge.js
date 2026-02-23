#!/usr/bin/env node
/**
 * One-time knowledge ingestion: read security docs from backend/docs/security/,
 * chunk them, embed via Ollama, and store in DocumentChunk with sourceType = "knowledge".
 *
 * Run from backend: node scripts/ingestKnowledge.js
 * Requires: Ollama running with nomic-embed-text, DB migrated.
 */

const path = require("path");
const fs = require("fs");
const { splitMarkdownIntoChunks } = require("../services/chunking");
const { storeChunks } = require("../services/vectorUtils");

const DOCS_DIR = path.join(__dirname, "..", "docs", "security");

async function main() {
  console.log("Knowledge ingestion: reading from", DOCS_DIR);

  if (!fs.existsSync(DOCS_DIR)) {
    console.error("Docs directory not found:", DOCS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error("No .md files in", DOCS_DIR);
    process.exit(1);
  }

  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const chunks = splitMarkdownIntoChunks(content);
    const topic = path.basename(file, ".md");
    for (const chunk of chunks) {
      allChunks.push({
        content: chunk,
        sourceType: "knowledge",
        scanId: null,
        reportId: null,
        metadata: { source: file, topic },
      });
    }
    console.log(`  ${file}: ${chunks.length} chunks`);
  }

  console.log("Storing", allChunks.length, "knowledge chunks (embedding via Ollama, sequential)...");

  const ids = await storeChunks(allChunks);
  console.log("Done. Stored", ids.length, "chunks.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
