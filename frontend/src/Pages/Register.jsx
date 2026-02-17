import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInput from "../Components/AuthInput/AuthInput";
import BrandingCard from "../Components/BrandingCard/BrandingCard";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <BrandingCard />
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 w-full">
          <h2 className="text-lg font-semibold text-white mb-5">Create your account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <AuthInput
              label="Full Name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <AuthInput
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <AuthInput
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 rounded-lg font-semibold text-white transition"
            >
              {loading ? "Creating account…" : "Register"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
