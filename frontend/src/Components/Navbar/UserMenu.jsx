import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User, UserPen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition"
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <User size={16} className="text-blue-400 shrink-0" />
        <span className="max-w-[120px] truncate">{user.name || "Account"}</span>
        <ChevronDown
          size={14}
          className="text-gray-400 shrink-0 transition-transform group-hover:rotate-180"
        />
      </button>

      <div className="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Signed in as
            </p>
            <p className="text-sm text-gray-200 truncate" title={user.email}>
              {user.email}
            </p>
          </div>

          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-800 hover:text-white transition"
          >
            <UserPen size={15} className="text-blue-400 shrink-0" />
            Edit profile
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition border-t border-slate-800"
          >
            <LogOut size={15} className="shrink-0" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
