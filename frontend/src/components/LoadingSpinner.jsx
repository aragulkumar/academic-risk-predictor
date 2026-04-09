export default function LoadingSpinner({ fullscreen = false }) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-surface-dark flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
          </div>
          <span className="text-gray-500 text-sm font-medium tracking-wide">Loading...</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-brand-500 animate-spin" />
    </div>
  )
}
