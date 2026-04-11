export default function StatCard({ icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand:    'text-brand-600 bg-brand-600/10 border-brand-600/20',
    teal:     'text-teal-600 bg-teal-600/10 border-teal-600/20',
    amber:    'text-amber-600 bg-amber-600/10 border-amber-600/20',
    red:      'text-red-600 bg-red-600/10 border-red-600/20',
    orange:   'text-orange-600 bg-orange-600/10 border-orange-600/20',
  }
  return (
    <div className="card animate-slide-up p-5 flex flex-col justify-center">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl mb-3 ${colorMap[color] ?? colorMap.brand}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}
