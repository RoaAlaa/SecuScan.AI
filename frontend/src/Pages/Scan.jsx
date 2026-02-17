import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandingCard from "../Components/BrandingCard/BrandingCard";

export default function Scan() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <BrandingCard />
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 w-full">
        <h1 className="text-lg font-bold text-white mb-1">Security Scan</h1>
        <p className="text-gray-400 text-xs mb-4">Enter a URL to scan for vulnerabilities.</p>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Website URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Scan Type</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option>Full Scan (All vulnerabilities)</option>
            <option>Quick Scan</option>
            <option>OWASP Top 10</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (!url) return;
            navigate("/loading", { state: { url } });
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition"
        >
          ▶ Run Scan
        </button>
        </div>
      </div>
    </div>
  );
}
