import { useNavigate } from "react-router-dom";

export default function ReadyScan() {
  const navigate = useNavigate();

  return (
    <section className="mt-24 px-6">
      <div
        className="max-w-5xl mx-auto text-center
                   bg-slate-900/60 backdrop-blur-2xl
                   border border-slate-700/50
                   rounded-2xl py-16 px-8
                   shadow-2xl shadow-black/40"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-wide">
          Ready to secure your website?
        </h2>

    
        <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-sm md:text-base">
           Start Scanning instantly without an account, or register to save history and access comprehensive security reports in seconds.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">

   
          <button
            onClick={() => navigate("/scan")}
            className="px-8 py-3 rounded-lg font-semibold
                       bg-emerald-500 hover:bg-emerald-600
                       text-black
                       transition duration-300
                       shadow-lg shadow-emerald-500/20"
          >
            Start Free Scan →
          </button>

     
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-3 rounded-lg font-semibold
                       border border-slate-600
                       hover:border-blue-500
                       hover:bg-slate-800
                       transition duration-300"
          >
            Sign Up
          </button>

        </div>
      </div>
    </section>
  );
}
