/**
 * Question classifier: calls n8n webhook that uses Gemini to decide
 * whether the question should go to RAG (knowledge base) or LLM (general chat).
 */

const N8N_CLASSIFIER_URL = process.env.N8N_CLASSIFIER_WEBHOOK_URL;
const CLASSIFIER_TIMEOUT_MS = parseInt(process.env.CLASSIFIER_TIMEOUT_MS || "15000", 10);

/**
 * Classify user message as "RAG" (technical/security question) or "LLM" (general/greeting).
 * @param {string} message - User's message
 * @returns {Promise<"RAG"|"LLM">}
 */
async function classifyQuestion(message) {
  if (!N8N_CLASSIFIER_URL) {
    return "RAG"; // Backward compatible: no webhook = always RAG
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);

  try {
    const res = await fetch(N8N_CLASSIFIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: String(message).trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn("Classifier webhook returned", res.status, "- defaulting to RAG");
      return "RAG";
    }

    const data = await res.json();
    const mode = (data.mode || data.Mode || "").toString().toUpperCase();

    if (mode === "LLM") return "LLM";
    return "RAG"; // Default: RAG (including invalid/missing mode)
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn("Classifier webhook timeout - defaulting to RAG");
    } else {
      console.warn("Classifier webhook error:", err.message, "- defaulting to RAG");
    }
    return "RAG";
  }
}

module.exports = { classifyQuestion };
