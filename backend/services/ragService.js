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

const ALLOWED_VULNERABILITIES = `- SQL Injection (SQLi)
- Server-Side Template Injection (SSTI)
- Server-Side Request Forgery (SSRF)
- Path Traversal (Directory Traversal)
- Broken Access Control (BAC)`;

const FURTHER_READING_LINKS = `SQL Injection (SQLi):
- [OWASP – SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PortSwigger Web Security Academy – SQL Injection](https://portswigger.net/web-security/sql-injection)

Server-Side Template Injection (SSTI):
- [PortSwigger Web Security Academy – Server-Side Template Injection](https://portswigger.net/web-security/server-side-template-injection)

Server-Side Request Forgery (SSRF):
- [OWASP – Server-Side Request Forgery](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery)
- [PortSwigger Web Security Academy – SSRF](https://portswigger.net/web-security/ssrf)

Path Traversal (Directory Traversal):
- [OWASP – Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [PortSwigger Web Security Academy – Directory Traversal](https://portswigger.net/web-security/file-path-traversal)

Broken Access Control (BAC):
- [OWASP Top 10: A01:2021 – Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/index.html)
- [PortSwigger Web Security Academy – Access Control](https://portswigger.net/web-security/access-control)`;

const SYSTEM_PROMPT = `You are a Security Analyst Assistant.

You are only allowed to answer questions about the following cybersecurity vulnerabilities:
${ALLOWED_VULNERABILITIES}

Behavior rules:

1) If the user question is about one of these vulnerabilities AND the retrieved context is relevant:
   - Use only the relevant context.
   - Explain clearly, professionally, and in your own words.
   - Keep examples simple and human-friendly.
   - Always end your answer with a "Further reading" section containing the official links for that topic (see below). Use markdown link format.

2) If the user question is about one of these vulnerabilities BUT the context does not have the answer:
   - Respond briefly:
     "This information is not available in the current knowledge base."
   - Suggest clarification or a more specific question.
   - Still include the "Further reading" links for the relevant topic.

3) If the user question is NOT about these vulnerabilities or web security:
   - Ignore the context completely.
   - Respond briefly (1–2 sentences).
   - Guide the user to ask about SQLi, SSTI, SSRF, Path Traversal, or BAC.

Further reading links (use only these URLs; do not invent others):

${FURTHER_READING_LINKS}

STRICT RULES:
- Do NOT explain your reasoning.
- Do NOT mention "retrieved context", "knowledge base chunks", or internal RAG mechanics.
- Do NOT answer questions outside web security or these five vulnerabilities.
- Do NOT hallucinate information or URLs.`;

const REPORT_SYSTEM_PROMPT = `You are a Security Analyst Assistant helping the user understand their SecuScan vulnerability scan report.

You may use TWO types of retrieved context:
1) Scan report context — specific findings from the user's selected scan (URLs, parameters, severity, evidence).
2) Knowledge base context — general web security and vulnerability information.

Allowed topics ONLY:
- The user's scan findings and report details
- Web application security and cybersecurity concepts
- These vulnerability types:
${ALLOWED_VULNERABILITIES}

Behavior rules:

1) If the question is about security, vulnerabilities, or the user's scan AND context is relevant:
   - Prioritize scan report context for scan-specific facts (findings, URLs, severity, evidence).
   - Use knowledge base context to explain concepts, impact, prevention, and remediation.
   - Do NOT invent findings, payloads, or URLs not present in the scan report.
   - When explaining a vulnerability type, end with a "Further reading" section using the links below.

2) If the question is about security or the scan BUT neither context contains the answer:
   - Respond briefly that the information is not available in the selected scan report or knowledge base.
   - Suggest a more specific question about a finding or vulnerability type.

3) If the question is NOT about security, vulnerabilities, or the user's scan:
   - Refuse briefly (1–2 sentences).
   - Ask the user to ask about their scan results or web security (SQLi, SSTI, SSRF, Path Traversal, BAC).

Further reading links (use only these URLs; do not invent others):

${FURTHER_READING_LINKS}

STRICT RULES:
- Do NOT explain your reasoning.
- Do NOT mention "retrieved context", "knowledge base chunks", or internal RAG mechanics.
- Do NOT answer off-topic non-security questions.
- Do NOT invent findings, payloads, or URLs not in the scan report.
- Do NOT hallucinate information or URLs.`;

function formatChunkSource(chunk) {
  if (chunk.sourceType === "report" || chunk.metadata?.type || chunk.metadata?.severity) {
    const parts = ["Scan report"];
    if (chunk.metadata?.type) parts.push(chunk.metadata.type);
    if (chunk.metadata?.severity) parts.push(chunk.metadata.severity);
    return parts.join(" · ");
  }
  return chunk.metadata?.source || "knowledge base";
}

function mapChunkForResponse(chunk) {
  if (chunk.sourceType === "report") {
    return {
      id: chunk.id,
      content: chunk.content,
      similarity: chunk.similarity,
      source: formatChunkSource(chunk),
      sourceType: "report",
    };
  }

  return {
    id: chunk.id,
    content: chunk.content,
    similarity: chunk.similarity,
    source: chunk.metadata?.source,
    sourceType: "knowledge",
  };
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
    chunks: chunks.map(mapChunkForResponse),
  };
}

/**
 * RAG: retrieve report + knowledge chunks for a scan, then generate answer.
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

  const reportLimit = options.reportLimit ?? REPORT_RETRIEVAL_LIMIT;
  const knowledgeLimit = options.knowledgeLimit ?? RETRIEVAL_LIMIT;
  const minSimilarity = options.minSimilarity ?? SIMILARITY_THRESHOLD;
  const similarityFilter =
    minSimilarity != null ? { minSimilarity } : {};

  const embedding = await getEmbedding(userQuery.trim());
  const [reportChunks, knowledgeChunks] = await Promise.all([
    findSimilarChunks(embedding, {
      sourceType: "report",
      scanId,
      limit: reportLimit,
      ...similarityFilter,
    }),
    findSimilarChunks(embedding, {
      sourceType: "knowledge",
      limit: knowledgeLimit,
      ...similarityFilter,
    }),
  ]);

  const chunks = [...reportChunks, ...knowledgeChunks];
  const prompt = buildPrompt(userQuery.trim(), chunks);
  const answer = await generateWithOllama(prompt, REPORT_SYSTEM_PROMPT);

  return {
    answer,
    mode: "report",
    chunks: chunks.map(mapChunkForResponse),
  };
}

/**
 * Route to knowledge or report RAG based on scanId.
 * @param {string} userQuery
 * @param {Object} [options]
 * @param {string} [options.scanId] - When set, uses report + knowledge chunks for this scan
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
