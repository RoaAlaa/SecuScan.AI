export default function FeatureCard({ title, description }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-600 transition">
      <h3 className="text-xl font-semibold mb-3">
        {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}
