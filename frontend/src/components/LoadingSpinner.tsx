interface LoadingSpinnerProps {
  label?: string
}

/** The hopping Routa pin and a short message, shown while something is loading. */
export default function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600" role="status">
      {/* the hop animation is inside the SVG file itself */}
      <img src="/routa-pin-loader.svg" alt="" className="h-16 w-16" />
      <span>{label}</span>
    </div>
  )
}