import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, LoaderCircle } from "lucide-react";

export default function Loading() {
  const location = useLocation();
  const url = location.state?.url || "https://example.com";
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  const steps = [
    "Checking SSL/TLS configuration...",
    "Analyzing security headers...",
    "Testing for SQL injection...",
    "Scanning for XSS vulnerabilities...",
    "Checking for CSRF protection..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        navigate("/results", {
          state: {
            url: url,
            summary: { critical: 2, high: 4, medium: 8, low: 5 }
          }
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, navigate, url]);

  const currentStep = Math.floor(progress / 20);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] pt-20 px-6">
        
   
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full animate-pulse"></div>
            <LoaderCircle 
              size={80} 
              className="text-blue-500 relative animate-spin" 
              strokeWidth={1.5}
              style={{ animationDuration: '3s' }}
            />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
            Scanning for Vulnerabilities
          </h1>
          <p className="text-sm text-slate-400">
            Analyzing <span className="text-blue-400 font-mono">{url}</span>
          </p>
        </div>

     
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800/50 rounded-3xl p-10 mb-5 w-full max-w-2xl shadow-2xl shadow-black/60">
          
          <div className="flex justify-between items-end mb-5">
            <div className="flex items-center gap-3 text-blue-400">
              <LoaderCircle size={20} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">System Engine Active</span>
            </div>
            <p className="text-2xl font-mono font-bold text-blue-500">
              {progress}%
            </p>
          </div>

          <div className="w-full bg-slate-800/50 rounded-full h-2.5 mb-10 overflow-hidden p-[2px] border border-slate-700/30">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>


          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                  index === currentStep 
                    ? "bg-blue-500/10 border border-blue-500/20 translate-x-2" 
                    : "border border-transparent"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : index === currentStep ? (
                  <LoaderCircle size={20} className="animate-spin text-blue-400" />
                ) : (
                  <div className="w-5 h-5 border-2 border-slate-800 rounded-full" />
                )}
                
                <span className={`font-medium transition-colors ${
                  index <= currentStep ? "text-slate-100" : "text-slate-600"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>

        </div>
    </div>
  );
}