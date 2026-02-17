import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, History } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-3 border-b border-slate-800/50 bg-slate-950/30 shrink-0">
      <Link to="/" className="flex items-center gap-2">
        <ShieldCheck size={22} className="text-blue-400" strokeWidth={1.5} />
        <span className="text-base font-bold text-white">SecuScan.AI</span>
      </Link>
      <div className="flex items-center gap-2 md:gap-3">
        {user ? (
          <>
            <Link to="/" className="text-sm text-gray-300 hover:text-white py-2 px-2 transition">
              Dashboard
            </Link>
            <Link to="/scan" className="text-sm text-gray-300 hover:text-white py-2 px-2 transition">
              Scan
            </Link>
            <Link to="/history" className="text-sm text-gray-300 hover:text-white py-2 px-2 transition flex items-center gap-1">
              <History size={14} className="shrink-0" />
              History
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition flex items-center gap-1"
            >
              <LogOut size={14} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/" className="text-sm text-gray-300 hover:text-white py-2 px-2 transition">
              Home
            </Link>
            <Link to="/login" className="text-sm text-gray-300 hover:text-white py-2 px-2 transition">
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
