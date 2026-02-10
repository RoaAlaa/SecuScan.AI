export default function AuthInput({ label, type, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-gray-400">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete="off"
        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3
                   focus:outline-none focus:border-blue-500 transition"
      />
    </div>
  )
}
