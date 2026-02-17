import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {ScanSearch,FileText,History,Zap,Brain,FileOutput, BotMessageSquare} from "lucide-react";
import Features from "../Components/Features/Features";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
              Run a new security scan and choose scan type and options.
            </p>
          </button>
          <button
            onClick={() => navigate("/report")}
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-6 text-left hover:border-blue-500/60 transition"
          >
            <FileText className="text-blue-400 mb-3" size={28} strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-white mb-1">View Report</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              See the latest vulnerability report and remediation steps.
            </p>
          </button>
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

      <section className="px-6  mt-16">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider  text-center">
          What SecuScan offers
        </h2>
        <Features />
      </section>

      <section className="mt-24 px-6">
        <div className="max-w-5xl mx-auto text-center bg-slate-900/60 border border-slate-700/50 rounded-2xl py-12 px-8">
          <h2 className="text-xl font-bold text-white mb-2 tracking-wide">
            Ready to secure your website?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6 text-sm">
            Run a security scan to detect vulnerabilities and get detailed reports with recommended fixes.
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
