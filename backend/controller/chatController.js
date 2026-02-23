const { chatWithKnowledge, chatWithLLM } = require("../services/ragService");
const { classifyQuestion } = require("../services/classifierService");

/**
 * POST /api/chat
 * Body: { message: string }
 * Classifies via n8n/Gemini → RAG (knowledge) or LLM (general). Returns answer + sources.
 */
exports.chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const mode = await classifyQuestion(message.trim());

    const { answer, chunks } =
      mode === "LLM" ? await chatWithLLM(message.trim()) : await chatWithKnowledge(message.trim());

    res.json({
      answer,
      mode: mode.toLowerCase(),
      sources: chunks.map((c) => ({
        id: c.id,
        preview: c.content.substring(0, 150) + (c.content.length > 150 ? "..." : ""),
        similarity: c.similarity,
        source: c.source,
      })),
    });
  } catch (err) {
    console.error("Chat error:", err);
    if (err.message?.includes("Ollama")) {
      return res.status(503).json({
        error: "AI service unavailable. Ensure Ollama is running and the model is pulled.",
      });
    }
    res.status(500).json({ error: err.message || "Chat failed" });
  }
};
