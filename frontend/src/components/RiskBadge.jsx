const LEVEL_CONFIG = {
  low:      { cls: 'badge-low',      dot: 'bg-teal-400',   label: 'Low Risk' },
  medium:   { cls: 'badge-medium',   dot: 'bg-amber-400',  label: 'Medium' },
  high:     { cls: 'badge-high',     dot: 'bg-orange-400', label: 'High Risk' },
  critical: { cls: 'badge-critical', dot: 'bg-red-400',    label: 'Critical' },
  unknown:  { cls: 'badge-medium',   dot: 'bg-gray-400',   label: 'Unknown' },
}

export default function RiskBadge({ level = 'unknown' }) {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.unknown
  return (
    <span className={cfg.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse-slow`} />
      {cfg.label}
    </span>
  )
}
