import { Link } from 'react-router'
import type { Route } from '../types/Route'
import { formatDuration, formatPeso, operatingHours } from '../utils/format'
import StatusBadge from './StatusBadge'
import TypeBadge from './TypeBadge'

/**
 * The key facts of a route in a compact form. Used in the map popup and in the side panel.
 */
export default function RouteSummary({ route }: { route: Route }) {
  const rows = [
    { label: 'Route code', value: route.routeCode },
    { label: 'Starting point', value: route.origin },
    { label: 'Destination', value: route.destination },
    { label: 'Fare', value: formatPeso(route.estimatedFare) },
    { label: 'Operating hours', value: operatingHours(route.schedules) },
    { label: 'Estimated travel time', value: formatDuration(route.estimatedMinutes) },
  ]

  return (
    <div className="min-w-[240px] space-y-2 text-sm">
      <p className="text-base font-semibold">{route.routeName}</p>
      <div className="flex flex-wrap gap-2">
        <TypeBadge type={route.transportation.type} />
        <StatusBadge status={route.currentStatus} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p>
        <span className="text-slate-500">Stops: </span>
        {route.stops.map((routeStop) => routeStop.stop.name).join(' \u2192 ')}
      </p>

      <Link to={`/routes/${route.id}`} className="inline-block font-semibold text-primary hover:underline">
        Full details
      </Link>
    </div>
  )
}
