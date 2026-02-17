import { useNavigate } from "react-router-dom";

export default function ReadyScan() {
  const navigate = useNavigate();

  return (
    <section className="mt-24 px-6 mb-6">
      <div
        className="max-w-5xl mx-auto text-center
                   bg-slate-900/60 backdrop-blur-2xl
                   border border-slate-700/50
                   rounded-2xl py-16 px-8
                   shadow-2xl shadow-black/40"
      >
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-wide">
          Ready to secure your website?
        </h2>

        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-sm">
          Start scanning instantly or register to save history and access comprehensive security reports.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate("/scan")}
            className="px-6 py-2.5 rounded-lg font-semibold text-white
                       bg-blue-600 hover:bg-blue-700
                       transition duration-300 border border-blue-500/30"
          >
            Start Free Scan →
          </button>
          <button
            onClick={() => navigate("/register")}
            className="px-6 py-2.5 rounded-lg font-semibold text-white
                       border border-slate-600 hover:border-blue-500/60
                       bg-slate-800/60 hover:bg-slate-700/60
                       transition duration-300"
          >
            Sign Up
          </button>

        </div>
      </div>
    </section>
  );
}
