import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-800/50 bg-slate-950/30 shrink-0">
      <div className="w-full px-6 md:px-10 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-white">SecuScan.AI</span>
          </div>
          <nav className="flex flex-wrap gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white transition">
              Home
            </Link>
            <Link to="/scan" className="text-gray-400 hover:text-white transition">
              Scan
            </Link>
            <Link to="/login" className="text-gray-400 hover:text-white transition">
              Login
            </Link>
            <Link to="/register" className="text-gray-400 hover:text-blue-400 transition">
              Register
            </Link>
          </nav>
        </div>
        <p className="mt-3 pt-3 border-t border-slate-800/50 text-[11px] text-gray-500 text-center md:text-left">
          © {currentYear} SecuScan.AI — AI-powered web security scanning.
        </p>
      </div>
    </footer>
  );
}
