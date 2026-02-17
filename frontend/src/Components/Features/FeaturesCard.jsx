/* eslint-disable no-unused-vars */
export default function FeatureCard({ icon: IconComponent, title, description }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-600 transition">
      <div className="mb-4">
        <IconComponent size={32} color="rgba(16, 80, 190, 1.00)" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
