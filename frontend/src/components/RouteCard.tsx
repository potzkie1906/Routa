import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Route } from '../types/Route'
import { formatDuration, formatPeso, operatingHours } from '../utils/format'
import StatusBadge from './StatusBadge'
import TypeBadge from './TypeBadge'

interface RouteCardProps {
  route: Route
  // optional extra buttons, for example "Remove" on the favorites page
  actions?: ReactNode
}

/** A short summary of one route, used in lists and search results. */
export default function RouteCard({ route, actions }: RouteCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={route.transportation.type} />
        <StatusBadge status={route.status} />
      </div>

      <h3 className="mt-3 text-lg font-semibold">
        <Link to={`/routes/${route.id}`} className="hover:text-primary hover:underline">
          {route.routeName}
        </Link>
      </h3>
      <p className="text-sm text-slate-600">
        {route.origin} &rarr; {route.destination}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">Fare</dt>
          <dd className="font-semibold">{formatPeso(route.estimatedFare)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Travel time</dt>
          <dd className="font-semibold">{formatDuration(route.estimatedMinutes)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Hours</dt>
          <dd className="font-semibold">{operatingHours(route.schedules)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Link to={`/routes/${route.id}`} className="text-sm font-semibold text-primary hover:underline">
          View details
        </Link>
        {actions}
      </div>
    </article>
  )
}
