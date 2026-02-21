import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ScanSearch,
  FileText,
  History,
  Zap,
  Brain,
  FileOutput,
  BotMessageSquare,
  Loader2,
} from "lucide-react";
import { api } from "../api/api";
import Features from "../Components/Features/Features";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingScans, setPendingScans] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPending() {
      try {
        const data = await api("GET", "/api/scans/pending");
        if (!cancelled) setPendingScans(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelled) setPendingScans([]);
      } finally {
        if (!cancelled) setLoadingPending(false);
      }
    }
    fetchPending();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pb-12">
      <section className="text-center mt-20 px-6 mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Welcome back, {user?.name || "User"}
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto text-sm md:text-base">
          Detect vulnerabilities in your web applications instantly with
          advanced AI technology and expert cybersecurity analysis.
        </p>
      </section>

      {pendingScans.length > 0 && (
        <section className="px-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
            Pending scans
          </h2>
          <div className="max-w-4xl mx-auto space-y-2">
            {pendingScans.map((scan) => (
              <div
                key={scan.id}
                className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{scan.targetUrl}</span>
                </div>
                <span className="text-xs text-gray-500">Report will be sent to your email when ready</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {loadingPending && pendingScans.length === 0 && (
        <section className="px-6 mb-8 max-w-4xl mx-auto">
          <div className="flex justify-center py-4">
            <Loader2 size={24} className="text-slate-500 animate-spin" />
          </div>
        </section>
      )}

      <section className="px-6 mb-12">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">
          Quick actions
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/scan")}
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-6 text-left hover:border-blue-500/60 transition"
          >
            <ScanSearch className="text-blue-400 mb-3" size={28} strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-white mb-1">New Scan</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Run a new security scan. The report will be sent to your email and added to history when finished.
            </p>
          </button>
          <Link
            to="/history"
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-6 text-left hover:border-blue-500/60 transition block"
          >
            <FileText className="text-blue-400 mb-3" size={28} strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-white mb-1">View Reports</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Open past scan reports from your history.
            </p>
          </Link>
          <Link
            to="/history"
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-6 text-left hover:border-blue-500/60 transition block"
          >
            <History className="text-blue-400 mb-3" size={28} strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-white mb-1">History</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Browse past scan results and reports.
            </p>
          </Link>
        </div>
      </section>

      <section className="px-6 mt-16">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center mb-4">
          What SecuScan offers
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600/50 transition">
            <Zap className="text-blue-400 mb-3" size={24} strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white mb-1">Fast scans</h3>
            <p className="text-gray-400 text-xs leading-relaxed">Get results in seconds with optimized scanning.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600/50 transition">
            <Brain className="text-blue-400 mb-3" size={24} strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white mb-1">AI detection</h3>
            <p className="text-gray-400 text-xs leading-relaxed">SQL injection, XSS, CSRF and more detected automatically.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600/50 transition">
            <FileOutput className="text-blue-400 mb-3" size={24} strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white mb-1">Detailed reports</h3>
            <p className="text-gray-400 text-xs leading-relaxed">Severity levels, evidence and recommended fixes.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600/50 transition">
            <BotMessageSquare className="text-blue-400 mb-3" size={24} strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white mb-1">AI assistance</h3>
            <p className="text-gray-400 text-xs leading-relaxed">Chat with AI for explanations and guidance.</p>
          </div>
        </div>
      </section>

      <section className="mt-24 px-6">
        <div className="max-w-5xl mx-auto text-center bg-slate-900/60 border border-slate-700/50 rounded-2xl py-12 px-8">
          <h2 className="text-xl font-bold text-white mb-2 tracking-wide">
            Ready to secure your website?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6 text-sm">
            Run a security scan to detect vulnerabilities. The report will be sent to your email and added to your history when finished.
          </p>
          <button
            onClick={() => navigate("/scan")}
            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-500/30 transition"
          >
            Start Scan →
          </button>
        </div>
      </section>
    </div>
  );
}
