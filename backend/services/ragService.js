/**
 * RAG service: retrieve relevant chunks, then generate response via Ollama.
 * Knowledge mode (default) or report mode when scanId is provided.
 */

const { getEmbedding, findSimilarChunks } = require("./vectorUtils");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama3.2";
const RETRIEVAL_LIMIT = parseInt(process.env.RAG_RETRIEVAL_LIMIT || "3", 10);
const REPORT_RETRIEVAL_LIMIT = parseInt(process.env.RAG_REPORT_RETRIEVAL_LIMIT || "5", 10);

// Similarity threshold (0-1). Chunks below this are excluded. Omit or invalid = no threshold.
function parseSimilarityThreshold() {
  const val = process.env.RAG_SIMILARITY_THRESHOLD;
  if (val === undefined || val === "") return null;
  const num = parseFloat(val);
  return Number.isFinite(num) && num >= 0 && num <= 1 ? num : null;
}
const SIMILARITY_THRESHOLD = parseSimilarityThreshold();

const SYSTEM_PROMPT = `You are a Security Analyst Assistant.

You are only allowed to answer questions about the following cybersecurity vulnerabilities:
- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Remote File Inclusion (RFI)
- Local File Inclusion (LFI)

Behavior rules:

1) If the user question is about one of these four vulnerabilities AND the retrieved context is relevant:
   - Use only the relevant context.
   - Explain clearly, professionally, and in your own words.
   - Keep examples simple and human-friendly.

2) If the user question is about one of these four vulnerabilities BUT the context does not have the answer:
   - Respond briefly:
     "This information is not available in the current knowledge base."
   - Suggest clarification or a more specific question.

3) If the user question is NOT about these four vulnerabilities:
   - Ignore the context completely.
   - Respond briefly (1–2 sentences).
   - Guide the user to ask about SQLi, XSS, RFI, or LFI.

STRICT RULES:
- Do NOT explain your reasoning.
- Do NOT mention context or sources.
- Do NOT answer questions outside these four vulnerabilities.
- Do NOT hallucinate information.`;

const REPORT_SYSTEM_PROMPT = `You are a Security Analyst Assistant helping the user understand their SecuScan vulnerability scan report.

You must answer questions using ONLY the retrieved scan report context.

Behavior rules:

1) If the user question can be answered from the report context:
   - Explain findings, severity, locations, business impact, remediation, and technical evidence clearly.
   - Reference specific details from the report (URLs, parameters, vulnerability types) when relevant.
   - Keep answers professional and in your own words.

2) If the user question is about their scan BUT the report context does not contain the answer:
   - Respond briefly:
     "This information is not available in the selected scan report."
   - Suggest they ask about a specific finding or check the full report page.

3) If the user question is general education (not about their specific scan findings):
   - Respond briefly that you are currently answering based on their selected scan report only.
   - Suggest they deselect the report to ask general vulnerability questions.

STRICT RULES:
- Do NOT explain your reasoning.
- Do NOT mention context or sources.
- Do NOT invent findings, payloads, or URLs not in the report.
- Do NOT hallucinate information.`;

function formatChunkSource(chunk) {
  if (chunk.sourceType === "report" || chunk.metadata?.type || chunk.metadata?.severity) {
    const parts = ["Scan report"];
    if (chunk.metadata?.type) parts.push(chunk.metadata.type);
    if (chunk.metadata?.severity) parts.push(chunk.metadata.severity);
    return parts.join(" · ");
  }
  return chunk.metadata?.source || "knowledge base";
}

/**
 * Build the prompt with retrieved context for Ollama.
 * Uses the RAG prompt format: Context + User Message + Answer.
 */
function buildPrompt(userQuery, contextChunks) {
  const contextBlocks = contextChunks.map((c) => {
    const source = formatChunkSource(c);
    return `[Source: ${source}]\n${c.content}`;
  });
  const retrievedContext = contextBlocks.join("\n\n---\n\n").trim();

  return `Context:
${retrievedContext || "(No relevant context found.)"}

User Message:
${userQuery}

Answer:
`;
}

/**
 * Call Ollama generate API (non-streaming).
 */
async function generateWithOllama(prompt, systemPrompt = SYSTEM_PROMPT) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      prompt,
      system: systemPrompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama generate failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.response?.trim() || "";
}

/**
 * RAG: retrieve knowledge chunks, then generate answer.
 * @param {string} userQuery - User's question
 * @param {Object} [options]
 * @param {number} [options.limit] - Max chunks to retrieve (default from env)
 * @returns {Promise<{ answer: string, chunks: Array }>}
 */
async function chatWithKnowledge(userQuery, options = {}) {
  if (!userQuery || typeof userQuery !== "string" || !userQuery.trim()) {
    throw new Error("Query is required");
  }

  const limit = options.limit ?? RETRIEVAL_LIMIT;
  const minSimilarity = options.minSimilarity ?? SIMILARITY_THRESHOLD;

  const embedding = await getEmbedding(userQuery.trim());
  const chunks = await findSimilarChunks(embedding, {
    sourceType: "knowledge",
    limit,
    ...(minSimilarity != null && { minSimilarity }),
  });

  const prompt = buildPrompt(userQuery.trim(), chunks);
  const answer = await generateWithOllama(prompt);

  return {
    answer,
    mode: "knowledge",
    chunks: chunks.map((c) => ({
      id: c.id,
      content: c.content,
      similarity: c.similarity,
      source: c.metadata?.source,
      sourceType: "knowledge",
    })),
  };
}

/**
 * RAG: retrieve report chunks for a scan, then generate answer.
 * @param {string} userQuery
 * @param {string} scanId
 * @param {Object} [options]
 * @returns {Promise<{ answer: string, mode: string, chunks: Array }>}
 */
async function chatWithReport(userQuery, scanId, options = {}) {
  if (!userQuery || typeof userQuery !== "string" || !userQuery.trim()) {
    throw new Error("Query is required");
  }
  if (!scanId) {
    throw new Error("scanId is required for report chat");
  }

  const limit = options.limit ?? REPORT_RETRIEVAL_LIMIT;
  const minSimilarity = options.minSimilarity ?? SIMILARITY_THRESHOLD;

  const embedding = await getEmbedding(userQuery.trim());
  const chunks = await findSimilarChunks(embedding, {
    sourceType: "report",
    scanId,
    limit,
    ...(minSimilarity != null && { minSimilarity }),
  });

  const prompt = buildPrompt(userQuery.trim(), chunks);
  const answer = await generateWithOllama(prompt, REPORT_SYSTEM_PROMPT);

  return {
    answer,
    mode: "report",
    chunks: chunks.map((c) => ({
      id: c.id,
      content: c.content,
      similarity: c.similarity,
      source: formatChunkSource(c),
      sourceType: "report",
    })),
  };
}

/**
 * Route to knowledge or report RAG based on scanId.
 * @param {string} userQuery
 * @param {Object} [options]
 * @param {string} [options.scanId] - When set, uses report chunks for this scan only
 */
async function chat(userQuery, options = {}) {
  const { scanId, ...rest } = options;
  if (scanId) {
    return chatWithReport(userQuery, scanId, rest);
  }
  return chatWithKnowledge(userQuery, rest);
}

module.exports = {
  chat,
  chatWithKnowledge,
  chatWithReport,
  buildPrompt,
  generateWithOllama,
};
