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

const KNOWLEDGE_TOPIC_EXPANSIONS = [
  {
    pattern: /\b(ssti|server[\s-]?side template injection|template injection|jinja2?|twig injection|freemarker)\b/i,
    retrievalQuery:
      "Server-Side Template Injection SSTI template engine Jinja2 Twig definition overview mechanism prevention",
  },
  {
    pattern: /\b(ssrf|server[\s-]?side request forgery)\b/i,
    retrievalQuery:
      "Server-Side Request Forgery SSRF definition overview internal network URL fetch prevention",
  },
  {
    pattern: /\b(sqli|sql injection|database injection|union select)\b/i,
    retrievalQuery:
      "SQL Injection SQLi database query injection definition overview prevention",
  },
  {
    pattern: /\b(path traversal|directory traversal|dot dot slash|\.\.\/)\b/i,
    retrievalQuery:
      "Path Traversal Directory Traversal file read definition overview prevention",
  },
  {
    pattern: /\b(bac|broken access control|idor|insecure direct object reference|privilege escalation|forced browsing|authorization bypass)\b/i,
    retrievalQuery:
      "Broken Access Control BAC IDOR authorization privilege escalation definition overview prevention",
  },
];

function expandKnowledgeQuery(userQuery) {
  const trimmed = userQuery.trim();
  for (const { pattern, retrievalQuery } of KNOWLEDGE_TOPIC_EXPANSIONS) {
    if (pattern.test(trimmed)) {
      return `${trimmed}\n\nRelated topic: ${retrievalQuery}`;
    }
  }
  return trimmed;
}

const SYSTEM_PROMPT = `You are a Security Analyst Assistant for SecuScan.AI.

Your knowledge base covers ONLY these five web application vulnerabilities:
1. SQL Injection (SQLi)
2. Server-Side Template Injection (SSTI)
3. Server-Side Request Forgery (SSRF)
4. Path Traversal (also called Directory Traversal, LFI-style file read via paths)
5. Broken Access Control (BAC, authorization failures, IDOR, privilege escalation)

Treat a user question as IN SCOPE if it is about any of the five topics above, including definitions, how they work, examples, detection, prevention, remediation, impact, or OWASP-related questions.

Recognize these topics even when the user uses abbreviations, alternate names, or informal phrasing. Examples:

SQL Injection (SQLi) — in scope when the user mentions:
- "sql injection", "sqli", "sql inject", "database injection", "sql attack"
- "inject sql", "malicious sql", "union select", "sql payload", "blind sql"
- "what is sql injection", "explain sqli", "how does sql injection work"
- "prevent sql injection", "fix sql injection", "detect sql injection"
- "sql injection example", "sql injection impact", "sql injection remediation"

Server-Side Template Injection (SSTI) — in scope when the user mentions:
- "ssti", "server side template injection", "server-side template injection"
- "template injection", "jinja injection", "jinja2 ssti", "twig injection", "freemarker ssti"
- "what is ssti", "explain ssti", "define ssti", "what does ssti mean"
- "how does ssti work", "how ssti happens", "ssti example", "ssti payload"
- "ssti detection", "prevent ssti", "fix ssti", "ssti remediation", "ssti impact"
- "render_template_string", "template engine attack"

Server-Side Request Forgery (SSRF) — in scope when the user mentions:
- "ssrf", "server side request forgery", "server-side request forgery"
- "what is ssrf", "explain ssrf", "define ssrf", "what does ssrf mean"
- "how does ssrf work", "ssrf attack", "ssrf example", "ssrf payload"
- "internal network attack", "fetch url vulnerability", "webhook url abuse"
- "cloud metadata ssrf", "169.254.169.254", "bypass firewall ssrf"
- "prevent ssrf", "detect ssrf", "fix ssrf", "ssrf remediation", "ssrf impact"
- Note: SSRF is NOT the same as CSRF/XSRF; if they ask about CSRF only, say you cover SSRF not CSRF

Path Traversal — in scope when the user mentions:
- "path traversal", "directory traversal", "directory climbing", "dot dot slash"
- "lfi via path", "read arbitrary files", "../../../etc/passwd"
- "what is path traversal", "explain path traversal", "define directory traversal"
- "how path traversal works", "path traversal example", "path traversal payload"
- "prevent path traversal", "detect path traversal", "fix path traversal"
- "file read vulnerability", "local file inclusion through paths"

Broken Access Control (BAC) — in scope when the user mentions:
- "bac", "broken access control", "access control vulnerability"
- "idor", "insecure direct object reference", "authorization bypass"
- "privilege escalation", "vertical escalation", "horizontal escalation"
- "forced browsing", "access control failure", "missing authorization"
- "what is bac", "explain broken access control", "what is idor"
- "how bac works", "bac example", "bac detection", "prevent bac", "fix bac"
- "unauthorized access", "admin panel without login", "access other user data"

Behavior rules:

1) If the question is IN SCOPE (one of the five topics above) AND the retrieved context contains relevant information:
   - Answer using ONLY the retrieved context.
   - Explain clearly, professionally, and in your own words.
   - For "what is X" or "define X" questions, give a clear definition first, then brief mechanism/impact if context supports it.

2) If the question is IN SCOPE but the retrieved context does not contain enough detail:
   - Respond briefly: "This information is not available in the current knowledge base."
   - Suggest a more specific question (e.g. prevention, detection, or examples).

3) If the question is NOT about SQLi, SSTI, SSRF, Path Traversal, or BAC:
   - Ignore the context completely.
   - Respond in 1–2 sentences that you only answer questions about SQL Injection, SSTI, SSRF, Path Traversal, and Broken Access Control (BAC).
   - Do NOT answer unrelated topics (XSS, CSRF, malware, networking, homework, etc.).

STRICT RULES:
- Do NOT say SSTI, SSRF, or BAC are outside your knowledge base — they ARE in scope.
- Do NOT redirect SQLi questions to XSS, RFI, or LFI — those are not your topics unless they clearly mean Path Traversal file read.
- Do NOT answer questions outside web application security.
- Do NOT explain your reasoning or mention context/sources.
- Do NOT hallucinate. Use retrieved context only for in-scope answers.`;

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
- Do NOT answer questions that are not about the selected scan report.
- Do NOT answer questions that are not about the vulnerabilities in the selected scan report.
- Do NOT answer questions that are not about SECURITY.
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
  const trimmedQuery = userQuery.trim();
  const retrievalQuery = expandKnowledgeQuery(trimmedQuery);

  const embedding = await getEmbedding(retrievalQuery);
  const chunks = await findSimilarChunks(embedding, {
    sourceType: "knowledge",
    limit,
    ...(minSimilarity != null && { minSimilarity }),
  });

  const prompt = buildPrompt(trimmedQuery, chunks);
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
  expandKnowledgeQuery,
  generateWithOllama,
};
