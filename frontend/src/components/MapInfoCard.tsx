import { Link } from 'react-router'
import { formatDuration, formatPeso } from '../utils/format'
import type { TapInfo } from '../utils/mapTap'
import StatusBadge from './StatusBadge'
import TypeBadge from './TypeBadge'

interface MapInfoCardProps {
  info: TapInfo
  status?: string // a short note, for example while the road lines load
  onClose: () => void
  onShowRoute: (routeId: number) => void // highlight the route on the map
}

/** The card that answers a tap: routes on a road, or trips from a terminal or stop. */
export default function MapInfoCard({ info, status, onClose, onShowRoute }: MapInfoCardProps) {
  const title = info.kind === 'road' ? 'Routes on this road' : info.stop.name
  const subtitle =
    info.kind === 'road'
      ? `${info.matches.length} route${info.matches.length === 1 ? '' : 's'} pass here`
      : `${info.trips.length} route${info.trips.length === 1 ? '' : 's'} leave from here`

  return (
    <section aria-label={title} className="flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
          {status && <p className="mt-0.5 text-xs text-primary">{status}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100">
          &times;
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* ---------- a road was tapped ---------- */}
        {info.kind === 'road' && info.matches.length === 0 && (
          <p className="text-sm text-slate-600">No route passes here. Tap closer to a colored line.</p>
        )}
        {info.kind === 'road' &&
          info.matches.map(({ route }) => (
            <button
              key={route.id}
              type="button"
              onClick={() => onShowRoute(route.id)}
              className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
            >
              <span className="flex flex-wrap items-center gap-2">
                <TypeBadge type={route.transportation.type} />
                <StatusBadge status={route.status} />
              </span>
              <span className="mt-1.5 block font-semibold">{route.routeName}</span>
              <span className="block text-xs text-slate-500">
                {route.origin} &rarr; {route.destination}
              </span>
              <span className="mt-2 flex gap-4 text-sm">
                <span>
                  <span className="text-slate-500">Fare </span>
                  {formatPeso(route.estimatedFare)}
                </span>
                <span>
                  <span className="text-slate-500">Time </span>
                  {formatDuration(route.estimatedMinutes)}
                </span>
              </span>
            </button>
          ))}

        {/* ---------- a terminal or stop was tapped ---------- */}
        {info.kind === 'stop' && info.trips.length === 0 && (
          <p className="text-sm text-slate-600">No route leaves from this stop (it may be the last stop of its routes).</p>
        )}
        {info.kind === 'stop' &&
          info.trips.map(({ route, destinations }) => (
            <div key={route.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={route.transportation.type} />
                <StatusBadge status={route.status} />
                <span className="ml-auto text-sm">
                  <span className="text-slate-500">Fare </span>
                  {formatPeso(route.estimatedFare)}
                </span>
              </div>
              <button type="button" onClick={() => onShowRoute(route.id)} className="mt-1.5 text-left font-semibold hover:underline">
                {route.routeName}
              </button>
              <ul className="mt-2 space-y-1 text-sm">
                {destinations.map(({ stop, minutes }) => (
                  <li key={stop.id} className="flex justify-between gap-3">
                    <span>to {stop.name}</span>
                    <span className="shrink-0 text-slate-500">{formatDuration(minutes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        <p className="text-[11px] leading-relaxed text-slate-500">
          Fare = the fare for the whole route (the app does not price part of a route). Times are estimates. Road lines: OSRM, OpenStreetMap data. Demo data.
        </p>
        <Link to="/routes" className="text-sm font-semibold text-primary hover:underline">
          Browse all routes
        </Link>
      </div>
    </section>
  )
}