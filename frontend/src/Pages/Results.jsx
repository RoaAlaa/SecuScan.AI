import { useNavigate, useLocation } from "react-router-dom";
import { BotMessageSquare, Download, Eye, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();

  const data = location.state;
  const url = data?.url || "https://example.com";

  const summary = data?.summary || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  const total =
    summary.critical +
    summary.high +
    summary.medium +
    summary.low;

  return (
    <div className="flex flex-col items-center pt-28 px-6 pb-16">

        <div className="text-center mb-14">
          <div className="flex items-center justify-center mb-6">
              <CheckCircle2 
                size={80} 
                strokeWidth={1.5} 
                className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
              />
            </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide">
            Scan Complete
          </h1>

          <p className="text-gray-400 text-sm">
            Analysis finished for
            <span className="text-blue-400 ml-1">
              {url}
            </span>
          </p>
        </div>

  
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-10 w-full max-w-5xl shadow-2xl shadow-black/40 mb-12">
          <h2 className="text-base font-semibold mb-6 text-gray-200">
            Vulnerability Summary
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            <div className="bg-red-900/30 border border-red-600/40 rounded-xl p-6 text-center hover:scale-105 transition duration-300">
              <p className="text-2xl font-bold text-red-400 mb-1">{summary.critical}</p>
              <p className="text-sm text-gray-300">Critical</p>
            </div>

            <div className="bg-orange-900/30 border border-orange-600/40 rounded-xl p-6 text-center hover:scale-105 transition duration-300">
              <p className="text-2xl font-bold text-orange-400 mb-1">{summary.high}</p>
              <p className="text-sm text-gray-300">High</p>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-600/40 rounded-xl p-6 text-center hover:scale-105 transition duration-300">
              <p className="text-2xl font-bold text-yellow-400 mb-1">{summary.medium}</p>
              <p className="text-sm text-gray-300">Medium</p>
            </div>

            <div className="bg-blue-900/30 border border-blue-600/40 rounded-xl p-6 text-center hover:scale-105 transition duration-300">
              <p className="text-2xl font-bold text-blue-400 mb-1">{summary.low}</p>
              <p className="text-sm text-gray-300">Low</p>
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="bg-orange-900/20 border border-orange-600/40 rounded-xl p-6 w-full max-w-5xl mb-12 shadow-md shadow-orange-900/20 flex gap-4 items-start">
            <AlertTriangle className="text-orange-400 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-orange-400 mb-2 text-sm">
                Action Required
              </p>
              <p className="text-gray-300 text-sm">
                {total} vulnerabilities detected. Review the detailed report and apply recommended fixes.
              </p>
            </div>
          </div>
        )}

        
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">

   
          <button
            onClick={() => navigate("/report")}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition duration-300 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye className="text-blue-400 group-hover:scale-105 transition-transform" size={24} />
              <p className="font-semibold text-base text-white">View Report</p>
            </div>
            <p className="text-gray-400 text-sm">
              Inspect detailed vulnerability findings
            </p>
          </button>

   
          <button
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition duration-300 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Download className="text-blue-400 group-hover:scale-105 transition-transform" size={24} />
              <p className="font-semibold text-base text-white">Download Report</p>
            </div>
            <p className="text-gray-400 text-sm">
              Export PDF security report
            </p>
          </button>

  
          <button
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition duration-300 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <BotMessageSquare className="text-blue-400 group-hover:scale-105 transition-transform" size={24} />
              <p className="font-semibold text-base text-white">Chat with AI</p>
            </div>
            <p className="text-gray-400 text-sm">
              Get AI explanation & recommendations
            </p>
          </button>
        </div>


        <button
          onClick={() => navigate("/scan")}
          className="mt-10 px-6 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-500/30 transition duration-300 flex items-center gap-2 text-sm"
        >
          <RefreshCw size={16} />
          New Scan
        </button>

    </div>
  );
}