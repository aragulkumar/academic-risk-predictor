export default function StatCard({ icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand:    'text-brand-400 bg-brand-600/10 border-brand-600/20',
    teal:     'text-teal-400 bg-teal-600/10 border-teal-600/20',
    amber:    'text-amber-400 bg-amber-600/10 border-amber-600/20',
    red:      'text-red-400 bg-red-600/10 border-red-600/20',
    orange:   'text-orange-400 bg-orange-600/10 border-orange-600/20',
  }
  return (
    <div className="stat-card animate-slide-up">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl ${colorMap[color] ?? colorMap.brand}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-100 mt-3">{value}</p>
      <p className="text-sm font-medium text-gray-300">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
