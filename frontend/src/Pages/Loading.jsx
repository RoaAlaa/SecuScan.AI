import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/NavBar/Navbar";
import { useLocation } from "react-router-dom";



export default function Loading() {
  const location = useLocation();
  const url = location.state?.url || "https://example.com";

  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const steps = [
    "Checking SSL/TLS configuration...",
    "Analyzing security headers...",
    "Testing for SQL injection...",
    "Scanning for XSS vulnerabilities...",
    "Checking for CSRF protection..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(() => {
        navigate("/results", {
          state: {
            url: url,
            summary: {
              critical: 2,
              high: 4,
              medium: 8,
              low: 5
            }
          }
        });
      }, 600);
    }
  }, [progress, navigate]);

  const currentStep = Math.floor(progress / 20);

  return (
    <>
        <Navbar />

      <div className="flex justify-center items-center pt-28 px-6">
        <div
          className="bg-slate-900/60 backdrop-blur-2xl
                     border border-slate-700/50
                     rounded-2xl p-10
                     w-full max-w-2xl
                     shadow-2xl shadow-black/40 text-center"
        >

          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Scanning for Vulnerabilities
          </h1>

          <p className="text-gray-400 mb-8">
            Analyzing {url}

          </p>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="text-blue-400 font-semibold mb-8">
            {progress}%
          </p>

          <div className="text-left space-y-3 text-sm text-gray-400">
            {steps.map((step, index) => (
              <p key={index}>
                {index < currentStep ? "✓" : "•"} {step}
              </p>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
