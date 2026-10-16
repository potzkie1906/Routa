import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
        <Logo className="h-6 w-auto" />
        <p className="mt-2">
          A school project. The route lines come from community data; fares, travel times and schedules are
          estimates, not official transportation information. Routa does not provide live GPS tracking.
        </p>
      </div>
    </footer>
  )
}