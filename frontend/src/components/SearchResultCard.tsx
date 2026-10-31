import { Link } from 'react-router'
import type { Route } from '../types/Route'
import { describeSchedule, formatDuration, formatPeso } from '../utils/format'
import { findTripSection } from '../utils/tripSection'
import StatusBadge from './StatusBadge'
import TypeBadge from './TypeBadge'

interface SearchResultCardProps {
  route: Route
  // what the user typed, used to point out where to get on and off
  origin: string
  destination: string
}

/** One search result: the information a passenger needs to decide. */
export default function SearchResultCard({ route, origin, destination }: SearchResultCardProps) {
  const section = findTripSection(route, origin, destination)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={route.transportation.type} />
        <StatusBadge status={route.currentStatus} />
      </div>

      <h3 className="mt-3 text-lg font-semibold">
        <Link to={`/routes/${route.id}`} className="hover:text-primary hover:underline">
          {route.routeName}
        </Link>
      </h3>
      <p className="text-sm text-slate-600">
        {route.origin} &rarr; {route.destination}
      </p>

      {section && (
        <p className="mt-3 rounded-lg bg-secondary/10 px-3 py-2 text-sm text-primary">
          Get on at <strong>{route.stops[section.boardIndex].stop.name}</strong>, get off at{' '}
          <strong>{route.stops[section.alightIndex].stop.name}</strong>
          {section.minutes > 0 && <> (about {formatDuration(section.minutes)} on board)</>}.
        </p>
      )}

      <p className="mt-3 text-sm">
        <span className="text-slate-500">Stops: </span>
        {route.stops.map((routeStop, index) => {
          const onYourTrip = section !== null && index >= section.boardIndex && index <= section.alightIndex
          return (
            <span key={routeStop.stop.id}>
              {index > 0 && ' \u2192 '}
              <span className={onYourTrip ? 'font-semibold' : 'text-slate-500'}>{routeStop.stop.name}</span>
            </span>
          )
        })}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Fare</dt>
          <dd className="font-semibold">{formatPeso(route.estimatedFare)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Estimated time (whole route)</dt>
          <dd className="font-semibold">{formatDuration(route.estimatedMinutes)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-slate-500">Operating schedule</dt>
          <dd className="font-semibold">
            {route.schedules.length === 0 ? (
              'N/A'
            ) : (
              <ul>
                {route.schedules.map((schedule) => (
                  <li key={`${schedule.daysOperating}-${schedule.firstTrip}`}>{describeSchedule(schedule)}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
        <Link to={`/routes/${route.id}`} className="text-primary hover:underline">
          View details
        </Link>
        <Link to={`/map?route=${route.id}`} className="text-primary hover:underline">
          View on map
        </Link>
      </div>
    </article>
  )
}
