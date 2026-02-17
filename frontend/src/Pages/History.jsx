import { Link } from "react-router-dom";
import { History as HistoryIcon, FileText } from "lucide-react";
import ProtectedRoute from "../Components/ProtectedRoute/ProtectedRoute";

function HistoryContent() {
  return (
    <div className="py-16 px-6 max-w-2xl mx-auto text-center">
      <HistoryIcon className="mx-auto text-slate-600 mb-4" size={48} strokeWidth={1.5} />
      <h1 className="text-xl font-bold text-white mb-2">Scan History</h1>
      <p className="text-sm text-gray-400 mb-6">
        Your past security scans and reports will appear here.
      </p>
      <Link
        to="/report"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
      >
        <FileText size={16} />
        View latest report
      </Link>
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
