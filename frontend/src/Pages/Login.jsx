import { Link } from "react-router-dom"
import AuthInput from "../Components/AuthInput/AuthInput"

export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800
                      rounded-2xl p-8 w-full max-w-md">

        <h1 className="text-center text-2xl font-bold mb-6">
          SecuScan.ai
        </h1>

        <h2 className="text-xl font-semibold mb-6">
          Login to your account
        </h2>

        <div className="flex flex-col gap-4">
          <AuthInput label="Email" type="email" placeholder="you@example.com" />
          <AuthInput label="Password" type="password" placeholder="••••••••" />

          <button className="mt-4 bg-blue-600 hover:bg-blue-700
                             py-3 rounded-lg font-semibold transition">
            Login
          </button>
        </div>

        <p className="text-sm text-center text-gray-400 mt-6">
          Don’t have an account?
          <Link to="/register" className="text-blue-500 ml-1 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
