import Navbar from "../Components/NavBar/Navbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";


export default function Scan() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  return (
    <>
      <Navbar/>

      <div className="flex justify-center items-center mt-24 px-4">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800
                        rounded-2xl p-8 w-full max-w-2xl">

          <h1 className="text-2xl font-bold mb-2">
            Security Scan
          </h1>

          <p className="text-gray-400 mb-6">
            Enter a URL to scan for vulnerabilities and security issues.
          </p>

          <div className="mb-5">
            <label className="block text-sm text-gray-400 mb-2">
              Website URL
            </label>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg
                        px-4 py-3 focus:outline-none focus:border-blue-500"
            />

          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Scan Type
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg
                         px-4 py-3 focus:outline-none focus:border-blue-500"
            >
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
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg
                      font-semibold flex items-center justify-center gap-2 transition"
          >
            ▶ Run Scan
          </button>


        </div>
      </div>
    </>
  )
}
