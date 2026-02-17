import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function BrandingCard() {
  return (
    <Link
      to="/"
      className="flex items-center justify-center gap-2 mb-5 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-lg p-3.5 hover:border-slate-700 transition w-full max-w-md"
    >
      <ShieldCheck size={26} className="text-blue-400 shrink-0" strokeWidth={1.5} />
      <span className="text-lg font-bold text-white">SecuScan.ai</span>
    </Link>
  );
}
