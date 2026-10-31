import type { Route } from '../types/Route'
import {
  describeDetails,
  formatDistance,
  formatDuration,
  formatPeso,
  formatTime,
} from '../utils/format'
import StatusBadge from './StatusBadge'
import TypeBadge from './TypeBadge'

/**
 * Everything about one route: summary, stops in order and schedules.
 * Used on the route page and in the map side card.
 */
export default function RouteDetails({ route }: { route: Route }) {
  const typeDetails = describeDetails(route.transportation)

  const summary = [
    { label: 'Estimated fare', value: formatPeso(route.estimatedFare) },
    { label: 'Travel time', value: formatDuration(route.estimatedMinutes) },
    { label: 'Distance', value: formatDistance(route.distanceKm) },
    { label: 'Route code', value: route.routeCode },
  ]

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={route.transportation.type} />
          <StatusBadge status={route.currentStatus} />
          {route.demoData && (
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              Demo data
            </span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{route.routeName}</h1>
        <p className="mt-1 text-slate-600">
          {route.origin} &rarr; {route.destination}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-sm text-slate-500">{item.label}</dt>
            <dd className="mt-1 text-lg font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="text-xl font-semibold">Operated by</h2>
        <p className="mt-2">{route.transportation.name}</p>
        {typeDetails.length > 0 && <p className="text-sm text-slate-600">{typeDetails.join(' · ')}</p>}
        {route.fareRule && (
          <p className="mt-1 text-sm text-slate-600">
            Fare rule: base {formatPeso(route.fareRule.baseFare)}, {formatPeso(route.fareRule.perKmRate)} per km.
            The estimated fare above is calculated by the {route.transportation.type.toLowerCase()} pricing rule.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Stops</h2>
        <ol className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
          {route.stops.map((routeStop) => (
            <li key={routeStop.stop.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {routeStop.stopOrder}
              </span>
              <div className="flex-1">
                <p className="font-medium">{routeStop.stop.name}</p>
                {routeStop.stop.description && (
                  <p className="text-sm text-slate-500">{routeStop.stop.description}</p>
                )}
              </div>
              <span className="text-sm text-slate-600">
                {routeStop.minutesFromStart === 0 ? 'Start' : `+${formatDuration(routeStop.minutesFromStart)}`}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Schedule</h2>
        {route.schedules.length === 0 ? (
          <p className="mt-2 text-slate-600">No schedule has been published for this route.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Days</th>
                  <th className="px-4 py-2 font-medium">First trip</th>
                  <th className="px-4 py-2 font-medium">Last trip</th>
                  <th className="px-4 py-2 font-medium">Every</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {route.schedules.map((schedule) => (
                  <tr key={`${schedule.daysOperating}-${schedule.firstTrip}`}>
                    <td className="px-4 py-2">{schedule.daysOperating}</td>
                    <td className="px-4 py-2">{formatTime(schedule.firstTrip)}</td>
                    <td className="px-4 py-2">{formatTime(schedule.lastTrip)}</td>
                    <td className="px-4 py-2">{schedule.frequencyMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
