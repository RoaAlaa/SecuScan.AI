import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandingCard from "../Components/BrandingCard/BrandingCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import { CRAWL_MODES, FULL_SCAN_TOOLS, SCAN_TOOLS } from "../utils/reportUtils";

const EMPTY_CREDENTIALS = {
  admin: { username: "", password: "" },
  user1: { username: "", password: "" },
  user2: { username: "", password: "" },
};

export default function Scan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [crawlMode, setCrawlMode] = useState(1);
  const [credentials, setCredentials] = useState(EMPTY_CREDENTIALS);
  const [selectedScans, setSelectedScans] = useState([]);
  const [fullScan, setFullScan] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const toggleTool = (toolId) => {
    setFullScan(false);
    setSelectedScans((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleFullScanToggle = () => {
    setFullScan((prev) => {
      const next = !prev;
      if (next) setSelectedScans([...FULL_SCAN_TOOLS]);
      else setSelectedScans([]);
      return next;
    });
  };

  const updateCredential = (role, field, value) => {
    setCredentials((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const scans = fullScan ? [...FULL_SCAN_TOOLS] : selectedScans;
    if (scans.length === 0) {
      setError("Select at least one vulnerability, or choose Full Scan.");
      return;
    }

    if (crawlMode >= 2) {
      const user1Valid = credentials.user1.username.trim() && credentials.user1.password;
      const user2Valid = credentials.user2.username.trim() && credentials.user2.password;
      if (!user1Valid || !user2Valid) {
        setError("Mode 2 and Mode 3 require user1 and user2 credentials.");
        return;
      }
    }

    if (crawlMode === 3) {
      const adminValid = credentials.admin.username.trim() && credentials.admin.password;
      if (!adminValid) {
        setError("Mode 3 requires admin credentials.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        url: url.trim(),
        crawlMode,
        scans,
      };

      if (crawlMode >= 2) {
        payload.credentials = {
          user1: credentials.user1,
          user2: credentials.user2,
        };
      }
      if (crawlMode === 3) {
        payload.credentials = {
          ...payload.credentials,
          admin: credentials.admin,
        };
      }

      const data = await api("POST", "/api/scans", payload);
      setSubmitted({
        scanId: data.scanId,
        reportWillBeSentTo: data.reportWillBeSentTo || user?.email,
      });
    } catch (err) {
      setError(err.message || "Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setUrl("");
    setCrawlMode(1);
    setCredentials(EMPTY_CREDENTIALS);
    setSelectedScans([]);
    setFullScan(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <BrandingCard />
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 w-full">
            <h2 className="text-lg font-bold text-white mb-3">Scan started</h2>
            <p className="text-gray-400 text-sm mb-4">
              When the scan finishes, the report will be emailed to your account at{" "}
              <span className="text-blue-400">{submitted.reportWillBeSentTo}</span>.
            </p>
            <p className="text-gray-400 text-sm mb-4">
              It will also appear in your <strong className="text-gray-300">History</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-slate-600 text-gray-300 hover:bg-slate-800 transition"
              >
                New scan
              </button>
              <button
                type="button"
                onClick={() => navigate(`/report/${submitted.scanId}`)}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition"
              >
                View report status
              </button>
              <button
                type="button"
                onClick={() => navigate("/history")}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                Go to History
              </button>
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
          <p className="text-gray-400 text-xs mb-4">
            Signed in as <span className="text-blue-400">{user?.email}</span>. The report will be sent to this email.
          </p>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Target URL</label>
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
            <label className="block text-xs text-gray-400 mb-2">Crawl mode</label>
            <div className="space-y-2">
              {CRAWL_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className="flex items-start gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 hover:border-slate-600 transition"
                >
                  <input
                    type="radio"
                    name="crawlMode"
                    value={mode.value}
                    checked={crawlMode === mode.value}
                    onChange={() => setCrawlMode(mode.value)}
                    className="mt-1 border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block text-sm text-gray-200">{mode.label}</span>
                    <span className="block text-xs text-gray-500">{mode.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {crawlMode >= 2 && (
            <div className="mb-4 space-y-3">
              <p className="text-xs text-gray-400">Session credentials</p>
              {crawlMode === 3 && (
                <CredentialFields
                  label="Admin"
                  values={credentials.admin}
                  onChange={(field, value) => updateCredential("admin", field, value)}
                />
              )}
              <CredentialFields
                label="User 1"
                values={credentials.user1}
                onChange={(field, value) => updateCredential("user1", field, value)}
              />
              <CredentialFields
                label="User 2"
                values={credentials.user2}
                onChange={(field, value) => updateCredential("user2", field, value)}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Vulnerabilities</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 hover:border-blue-500/50 transition">
                <input
                  type="checkbox"
                  checked={fullScan}
                  onChange={handleFullScanToggle}
                  className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-white font-medium">Full Scan</span>
                <span className="text-xs text-gray-500 ml-auto">All vulnerabilities</span>
              </label>
              {SCAN_TOOLS.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 hover:border-slate-600 transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedScans.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    disabled={fullScan}
                    className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-200">{tool.label}</span>
                </label>
              ))}
            </div>
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

function CredentialFields({ label, values, onChange }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
      <p className="text-xs text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Username"
          value={values.username}
          onChange={(e) => onChange("username", e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={values.password}
          onChange={(e) => onChange("password", e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
