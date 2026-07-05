import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, ShieldCheck, FileText, ChevronDown } from "lucide-react";
import { api } from "../api/api";
import { useAuth } from "../context/AuthContext";

function formatScanLabel(scan) {
  const url = scan.targetUrl || "Unknown URL";
  const date = scan.createdAt
    ? new Date(scan.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  return date ? `${url} — ${date}` : url;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const selectedScan = scans.find((s) => s.id === selectedScanId) || null;
  const reportMode = Boolean(selectedScanId);

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!user) {
      setScans([]);
      setSelectedScanId("");
      return;
    }

    let cancelled = false;
    setScansLoading(true);

    async function fetchScans() {
      try {
        const data = await api("GET", "/api/scans");
        if (cancelled) return;
        const completed = (Array.isArray(data) ? data : []).filter(
          (s) => s.status === "completed" && Array.isArray(s.reports) && s.reports.length > 0
        );
        setScans(completed);
        setSelectedScanId((prev) => (prev && completed.some((s) => s.id === prev) ? prev : ""));
      } catch (_) {
        if (!cancelled) setScans([]);
      } finally {
        if (!cancelled) setScansLoading(false);
      }
    }

    fetchScans();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const body = { message: text };
      if (selectedScanId) body.scanId = selectedScanId;

      const data = await api("POST", "/api/chat", body);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          mode: data.mode,
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
    <div className="flex flex-1 flex-col h-[calc(100vh-120px)] min-h-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/50 shrink-0">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle size={22} className="text-blue-400" />
          Secu Assistant
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {reportMode
            ? "Answering using your selected scan report and the security knowledge base. Only security-related questions are allowed."
            : "Ask about SQLi, SSTI, SSRF, path traversal, or broken access control. Answers are based on the knowledge base."}
        </p>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck size={48} className="text-slate-600 mb-4" strokeWidth={1.5} />
              <p className="text-gray-400 text-sm mb-2">
                {reportMode ? "Ask about your scan report" : "Ask a security question"}
              </p>
              <p className="text-gray-500 text-xs max-w-sm">
                {reportMode ? (
                  <>
                    e.g. &quot;Summarize the critical findings&quot; or &quot;How do I fix the SQLi
                    finding?&quot;
                  </>
                ) : (
                  <>
                    e.g. &quot;How do I prevent SQL injection?&quot; or &quot;What is SSRF?&quot;
                  </>
                )}
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
                  {msg.role === "assistant" && msg.mode === "report" && (
                    <p className="text-[10px] uppercase tracking-wide text-amber-400/90 mb-2">
                      From scan report
                    </p>
                  )}
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
                            <span
                              className={
                                s.sourceType === "report" ? "text-amber-400" : "text-blue-400"
                              }
                            >
                              {s.source}
                            </span>
                            {s.similarity != null && (
                              <span className="ml-1">
                                ({(s.similarity * 100).toFixed(0)}% match)
                              </span>
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

      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-slate-800/50 bg-slate-950/90 backdrop-blur-sm shrink-0 sticky bottom-0 z-10"
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {user && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label
                htmlFor="report-select"
                className="text-xs text-gray-400 shrink-0 flex items-center gap-1.5"
              >
                <FileText size={14} className="text-blue-400" />
                Report context
              </label>
              <div className="relative flex-1">
                <select
                  id="report-select"
                  value={selectedScanId}
                  onChange={(e) => setSelectedScanId(e.target.value)}
                  disabled={loading || scansLoading}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="">None — general questions only</option>
                  {scans.map((scan) => (
                    <option key={scan.id} value={scan.id}>
                      {formatScanLabel(scan)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
              {scansLoading && (
                <span className="text-xs text-gray-500 shrink-0">Loading reports…</span>
              )}
              {!scansLoading && scans.length === 0 && (
                <span className="text-xs text-gray-500 shrink-0">No completed reports yet</span>
              )}
            </div>
          )}

          {!user && (
            <p className="text-xs text-gray-500">
              Log in to ask questions about your scan reports.
            </p>
          )}

          {reportMode && selectedScan && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Using report for: <span className="text-amber-200">{selectedScan.targetUrl}</span>
            </p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                reportMode
                  ? "Ask about this scan report..."
                  : "Ask about vulnerabilities..."
              }
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
        </div>
      </form>
    </div>
  );
}
