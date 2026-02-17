export default function AuthInput({ label, type, placeholder, value, onChange, name, autoComplete }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name || label} className="text-sm text-gray-400">
        {label}
      </label>
      <input
        id={name || label}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        autoComplete={autoComplete ?? "off"}
        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500
                   focus:outline-none focus:border-blue-500 transition text-sm"
      />
    </div>
  );
}
