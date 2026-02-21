import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandingCard from "../Components/BrandingCard/BrandingCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

export default function Scan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = user ? { targetUrl: url.trim() } : { targetUrl: url.trim(), email: email.trim() };
      const data = await api("POST", "/api/scans", body);
      setSubmitted({
        scanId: data.scanId,
        reportWillBeSentTo: data.reportWillBeSentTo,
        reportLink: data.reportLink,
      });
    } catch (err) {
      setError(err.message || "Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <BrandingCard />
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 w-full">
            <h2 className="text-lg font-bold text-white mb-3">Scan started</h2>
            <p className="text-gray-400 text-sm mb-4">
              The scan may take a few minutes. When it finishes, the report will be sent to{" "}
              <span className="text-blue-400">
                {submitted.reportWillBeSentTo || "your email"}
              </span>
              .
            </p>
            {user ? (
              <p className="text-gray-400 text-sm mb-4">
                The report will also be added to your <strong className="text-gray-300">History</strong> so you can open it from your dashboard.
              </p>
            ) : (
              <p className="text-gray-400 text-sm mb-4">
                You can only access the report from the link in that email.
              </p>
            )}
            {submitted.reportLink && (
              <p className="text-xs text-gray-500 mb-4 break-all">
                Save this link to open the report later: {submitted.reportLink}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(null);
                  setUrl("");
                  setEmail("");
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-slate-600 text-gray-300 hover:bg-slate-800 transition"
              >
                New scan
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <BrandingCard />
        <form onSubmit={handleSubmit} className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 w-full">
          <h1 className="text-lg font-bold text-white mb-1">Security Scan</h1>
          <p className="text-gray-400 text-xs mb-4">Enter a URL to scan for vulnerabilities.</p>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {!user && (
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Your email (report will be sent here)</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Website URL</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Scan Type</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option>Full Scan (All vulnerabilities)</option>
              <option>Quick Scan</option>
              <option>OWASP Top 10</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition"
          >
            {loading ? "Starting scan…" : "▶ Run Scan"}
          </button>
        </form>
      </div>
    </div>
  );
}
