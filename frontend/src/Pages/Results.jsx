import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Components/NavBar/Navbar";

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
    <>
    <Navbar />
      <div className="flex flex-col items-center pt-28 px-6 pb-16">

        <div className="text-center mb-14">

          <div
            className="w-20 h-20 rounded-full bg-green-600/20 
                       border border-green-500/40
                       flex items-center justify-center mx-auto mb-6
                       shadow-lg shadow-green-500/20"
          >
            <span className="text-4xl text-green-400">✓</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-wide">
            Scan Complete
          </h1>

          <p className="text-gray-400 text-sm md:text-base">
            Analysis finished for
            <span className="text-blue-400 ml-1">
              {url}
            </span>
          </p>
        </div>

        <div
          className="bg-slate-900/60 backdrop-blur-2xl
                     border border-slate-700/50
                     rounded-2xl p-10
                     w-full max-w-5xl
                     shadow-2xl shadow-black/40
                     mb-12"
        >
          <h2 className="text-lg md:text-xl font-semibold mb-8 text-gray-200">
            Vulnerability Summary
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            <div className="bg-red-900/30 border border-red-600/40 
                            rounded-xl p-6 text-center
                            hover:scale-105 transition duration-300">
              <p className="text-3xl font-bold text-red-400 mb-1">
                {summary.critical}
              </p>
              <p className="text-sm text-gray-300">Critical</p>
            </div>

            <div className="bg-orange-900/30 border border-orange-600/40 
                            rounded-xl p-6 text-center
                            hover:scale-105 transition duration-300">
              <p className="text-3xl font-bold text-orange-400 mb-1">
                {summary.high}
              </p>
              <p className="text-sm text-gray-300">High</p>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-600/40 
                            rounded-xl p-6 text-center
                            hover:scale-105 transition duration-300">
              <p className="text-3xl font-bold text-yellow-400 mb-1">
                {summary.medium}
              </p>
              <p className="text-sm text-gray-300">Medium</p>
            </div>

            <div className="bg-blue-900/30 border border-blue-600/40 
                            rounded-xl p-6 text-center
                            hover:scale-105 transition duration-300">
              <p className="text-3xl font-bold text-blue-400 mb-1">
                {summary.low}
              </p>
              <p className="text-sm text-gray-300">Low</p>
            </div>

          </div>
        </div>

        {total > 0 && (
          <div
            className="bg-orange-900/20 border border-orange-600/40
                       rounded-xl p-6
                       w-full max-w-5xl
                       mb-12
                       shadow-md shadow-orange-900/20"
          >
            <p className="font-semibold text-orange-400 mb-2 text-sm">
              ⚠ Action Required
            </p>

            <p className="text-gray-300 text-sm">
              {total} vulnerabilities detected. Review the detailed report and apply recommended fixes.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">

                  <button
            onClick={() => navigate("/report")}
            className="bg-slate-900/60 backdrop-blur-xl
                      border border-slate-700/50
                      rounded-xl p-8
                      hover:border-blue-500/60
                      hover:shadow-lg hover:shadow-blue-500/10
                      transition duration-300"
          >
            <p className="font-semibold text-lg mb-1">View Report</p>
            <p className="text-gray-400 text-sm">
              Inspect detailed vulnerability findings
            </p>
          </button>


          <button
            className="bg-slate-900/60 backdrop-blur-xl
                       border border-slate-700/50
                       rounded-xl p-8
                       hover:border-blue-500/60
                       hover:shadow-lg hover:shadow-blue-500/10
                       transition duration-300"
          >
            <p className="font-semibold text-lg mb-1">Download Report</p>
            <p className="text-gray-400 text-sm">
              Export PDF security report
            </p>
          </button>

          <button
            className="bg-slate-900/60 backdrop-blur-xl
                       border border-slate-700/50
                       rounded-xl p-8
                       hover:border-blue-500/60
                       hover:shadow-lg hover:shadow-blue-500/10
                       transition duration-300"
          >
            <p className="font-semibold text-lg mb-1">Chat with AI</p>
            <p className="text-gray-400 text-sm">
              Get AI explanation & recommendations
            </p>
          </button>

        </div>

        <button
          onClick={() => navigate("/scan")}
          className="mt-12 px-8 py-3 bg-blue-600 hover:bg-blue-700
                     rounded-lg font-semibold transition duration-300"
        >
          🔄 Rescan
        </button>

      </div>
    </>
  );
}
