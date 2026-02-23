/**
 * RAG service: retrieve relevant chunks from knowledge base, then generate response via Ollama.
 * Knowledge-only for now (no report context).
 */

const { getEmbedding, findSimilarChunks } = require("./vectorUtils");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama3.2";
const RETRIEVAL_LIMIT = parseInt(process.env.RAG_RETRIEVAL_LIMIT || "5", 10);

const SYSTEM_PROMPT = `You are a Security Analyst Assistant and Vulnerability Explainer for SecuScan.

Rules:
- Use ONLY the provided context from the knowledge base. Do not add information from outside the context (no hallucinations).
- Be concise, factual, and technical. No vague generalizations.
- If the context does not contain enough information to answer, say exactly that and do not guess.
- If different context chunks conflict, summarize both views and clearly indicate that the information conflicts.`;

const OUTPUT_FORMAT_INSTRUCTION = `Format your response as:
- **Name**: (vulnerability or topic name)
- **Description**: (factual, technical description from context only)
- **Source**: (document name from context, e.g. sql_injection.md)`;

/** Used when question is general/greeting/casual (non-RAG path via n8n/Gemini classifier). */
const GENERAL_SYSTEM_PROMPT = `You are a Security Assistant.
- Only answer general questions, greetings, or casual conversation briefly and concisely (1–2 sentences).
- Do NOT explain anything in detail.
- Always remind the user: "I am your Security Assistant and I'm here to help regarding any security-related questions."
- Never answer technical vulnerability questions (those will go to RAG).
- Example responses:
  Q: "Hi" → "Hi! I'm your Security Assistant and I'm here to help regarding any security-related questions."
  Q: "How are you?" → "I'm fine! I'm your Security Assistant here to help with any security-related questions."`;

/**
 * Build the prompt with retrieved context for Ollama.
 * Each chunk is labeled with its source so the model can cite it.
 */
function buildPrompt(userQuery, contextChunks) {
  const contextBlocks = contextChunks.map((c) => {
    const source = c.metadata?.source || "knowledge base";
    return `[Source: ${source}]\n${c.content}`;
  });
  const contextText = contextBlocks.join("\n\n---\n\n").trim();

  const userPrompt = contextText
    ? `Context (use ONLY this):\n\n${contextText}\n\n---\n\nQuestion: ${userQuery}\n\n${OUTPUT_FORMAT_INSTRUCTION}`
    : `Question: ${userQuery}\n\nNo relevant context found. Reply briefly that you cannot answer from the knowledge base.`;

  return userPrompt;
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

  const embedding = await getEmbedding(userQuery.trim());
  const chunks = await findSimilarChunks(embedding, {
    sourceType: "knowledge",
    limit,
  });

  const prompt = buildPrompt(userQuery.trim(), chunks);
  const answer = await generateWithOllama(prompt);

  return {
    answer,
    chunks: chunks.map((c) => ({
      id: c.id,
      content: c.content,
      similarity: c.similarity,
      source: c.metadata?.source,
    })),
  };
}

/**
 * LLM-only path (no RAG): for general questions, greetings, casual chat.
 * Uses GENERAL_SYSTEM_PROMPT to keep responses brief and redirect to security topics.
 */
async function chatWithLLM(userQuery) {
  if (!userQuery || typeof userQuery !== "string" || !userQuery.trim()) {
    throw new Error("Query is required");
  }
  const answer = await generateWithOllama(userQuery.trim(), GENERAL_SYSTEM_PROMPT);
  return { answer, chunks: [] };
}

module.exports = {
  chatWithKnowledge,
  chatWithLLM,
  buildPrompt,
  generateWithOllama,
};
