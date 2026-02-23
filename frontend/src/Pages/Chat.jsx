import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, ShieldCheck, FileText } from "lucide-react";
import { api } from "../api/api";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await api("POST", "/api/chat", { message: text });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to get response");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-120px)] min-h-0">
      <div className="px-6 py-4 border-b border-slate-800/50 shrink-0">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle size={22} className="text-blue-400" />
          Vulnerability Chat
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Ask about SQL injection, XSS, LFI, RFI, and other vulnerabilities. Answers are based on the knowledge base.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck size={48} className="text-slate-600 mb-4" strokeWidth={1.5} />
              <p className="text-gray-400 text-sm mb-2">Ask a security question</p>
              <p className="text-gray-500 text-xs max-w-sm">
                e.g. &quot;How do I prevent SQL injection?&quot; or &quot;What is XSS?&quot;
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600/80 text-white"
                      : "bg-slate-800/80 border border-slate-700 text-gray-200"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="mt-3 pt-3 border-t border-slate-600/50">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-1">
                        <FileText size={12} />
                        {msg.sources.length} source(s)
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-gray-500">
                        {msg.sources.map((s, j) => (
                          <li key={j}>
                            <span className="text-blue-400">{s.source}</span>
                            {s.similarity != null && (
                              <span className="ml-1">({(s.similarity * 100).toFixed(0)}% match)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={18} className="animate-spin shrink-0" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 shrink-0">
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 max-w-2xl mx-auto">
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-slate-800/50 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about vulnerabilities..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-3 rounded-xl transition flex items-center gap-2 shrink-0"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
