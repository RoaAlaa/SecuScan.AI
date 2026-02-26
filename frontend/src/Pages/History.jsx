import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History as HistoryIcon, FileText, Loader2, Trash2 } from "lucide-react";
import ProtectedRoute from "../Components/ProtectedRoute/ProtectedRoute";
import { api } from "../api/api";

function HistoryContent() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, scanId) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(scanId);
    try {
      await api("DELETE", `/api/scans/${scanId}`);
      setScans((prev) => prev.filter((s) => s.id !== scanId));
    } catch (_) {
      setDeletingId(null);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchScans() {
      try {
        const data = await api("GET", "/api/scans");
        if (!cancelled) setScans(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelled) setScans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchScans();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="py-16 px-6 max-w-2xl mx-auto text-center">
        <HistoryIcon className="mx-auto text-slate-600 mb-4" size={48} strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-white mb-2">Scan History</h1>
        <p className="text-sm text-gray-400 mb-6">
          Your past security scans and reports will appear here. Run a scan from the dashboard to get started.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Scan History</h1>
      <ul className="space-y-3">
        {scans.map((scan) => (
          <li key={scan.id}>
            <Link
              to={`/report/${scan.id}`}
              className="flex items-center justify-between gap-4 bg-slate-900/70 border border-slate-700 rounded-xl p-4 hover:border-blue-500/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="text-blue-400 shrink-0" />
                <span className="text-sm text-gray-300 truncate">{scan.targetUrl}</span>
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {scan.status === "pending" ? "Pending" : new Date(scan.createdAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, scan.id)}
                disabled={deletingId === scan.id}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition shrink-0 disabled:opacity-50"
                title="Delete report"
              >
                <Trash2 size={18} />
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function History() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
