const prisma = require("../prismaClient");
const { chat } = require("../services/ragService");

/**
 * POST /api/chat
 * Body: { message: string, scanId?: string }
 * RAG chatbot: knowledge base by default, or a selected scan report when scanId is provided.
 */
exports.chat = async (req, res) => {
  try {
    const { message, scanId } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    let validatedScanId = null;

    if (scanId != null && scanId !== "") {
      if (typeof scanId !== "string") {
        return res.status(400).json({ error: "scanId must be a string" });
      }

      if (!req.userId) {
        return res.status(401).json({ error: "Login required to ask about a scan report" });
      }

      const scan = await prisma.scan.findUnique({
        where: { id: scanId.trim() },
        include: { reports: { take: 1 } },
      });

      if (!scan || scan.userId !== req.userId) {
        return res.status(403).json({ error: "Scan not found or access denied" });
      }

      if (scan.status !== "completed" || scan.reports.length === 0) {
        return res.status(400).json({ error: "Report is not ready yet for this scan" });
      }

      validatedScanId = scan.id;
    }

    const { answer, chunks, mode } = await chat(message.trim(), {
      scanId: validatedScanId,
    });

    res.json({
      answer,
      mode: mode || (validatedScanId ? "report" : "knowledge"),
      scanId: validatedScanId,
      sources: chunks.map((c) => ({
        id: c.id,
        preview: c.content.substring(0, 150) + (c.content.length > 150 ? "..." : ""),
        similarity: c.similarity,
        source: c.source,
        sourceType: c.sourceType,
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
