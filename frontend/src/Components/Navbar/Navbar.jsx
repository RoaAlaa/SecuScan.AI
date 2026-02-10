import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-10 py-6">
      <h1 className="text-2xl font-bold text-blue-500">
        SecuScan.AI
      </h1>

      <div className="flex gap-4">
        <Link to="/login" className="text-blue-300 py-2 hover:text-white">
          Login
        </Link>
        <Link
          to="/register"
          className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Register
        </Link>
      </div>
    </nav>
  )
}
