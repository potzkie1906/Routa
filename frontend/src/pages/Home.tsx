import { Link } from 'react-router'
import AlertCard from '../components/AlertCard'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import RouteCard from '../components/RouteCard'
import { useApiData } from '../hooks/useApiData'
import { getActiveAlerts } from '../services/alertService'
import { getRoutes } from '../services/routeService'
import { getPublicStats } from '../services/statsService'
import { TRANSPORT_COLORS } from '../utils/transportColors'

const transportTypes = [
  { name: 'Bus', description: 'Long-distance and express routes between towns.' },
  { name: 'Jeepney', description: 'The classic local route, with stops along the way.' },
  { name: 'Van', description: 'Fast point-to-point vans between terminals.' },
]

// These functions are defined outside the component so they keep the same identity
// between renders (see useApiData).
// There is no usage data yet, so "popular" is simply the first active routes by name.
const loadPopularRoutes = () => getRoutes({ status: 'ACTIVE' }).then((routes) => routes.slice(0, 3))
const loadLatestAlerts = () => getActiveAlerts().then((alerts) => alerts.slice(0, 3))

export default function Home() {
  const stats = useApiData(getPublicStats)
  const popular = useApiData(loadPopularRoutes)
  const alerts = useApiData(loadLatestAlerts)

  // one card per number; the value is null until the statistics have loaded
  const loaded = stats.state.status === 'success' ? stats.state.data : null
  const statCards = [
    { label: 'Active routes', value: loaded?.activeRoutes ?? null },
    { label: 'Transportation stops', value: loaded?.stops ?? null },
    { label: 'Available vehicles', value: loaded?.availableVehicles ?? null },
    { label: 'Active alerts', value: loaded?.activeAlerts ?? null },
  ]

  return (
    <div className="space-y-12">
      {/* hero */}
        <section className="rounded-2xl bg-linear-to-br from-primary to-secondary px-6 py-14 text-center text-white sm:px-12">
        <h1 className="text-3xl font-bold sm:text-5xl">Navigate Your City With Confidence</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
          Find buses, jeepneys, and vans route in one place.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/map" className="rounded-lg bg-white px-6 py-3 font-semibold text-primary hover:bg-white/90">
            Explore Map
          </Link>
          <Link to="/routes" className="rounded-lg border border-white/60 px-6 py-3 font-semibold hover:bg-white/10">
            Find a Route
          </Link>
        </div>
      </section>

      {/* statistics */}
      <section aria-label="Statistics">
        {stats.state.status === 'error' && <ErrorMessage message={stats.state.message} onRetry={stats.reload} />}
        {stats.state.status !== 'error' && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-primary">{card.value ?? '\u2014'}</p>
                <p className="mt-1 text-sm text-slate-600">{card.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* popular routes */}
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Popular Routes</h2>
          <Link to="/routes" className="text-sm font-semibold text-primary hover:underline">
            See all routes
          </Link>
        </div>
        <div className="mt-4">
          {popular.state.status === 'loading' && <LoadingSpinner />}
          {popular.state.status === 'error' && <ErrorMessage message={popular.state.message} onRetry={popular.reload} />}
          {popular.state.status === 'success' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {popular.state.data.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* transportation types */}
      <section>
        <h2 className="text-2xl font-bold">Transportation Types</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {transportTypes.map((type) => (
            <div
              key={type.name}
              className="rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm"
              style={{ borderTopColor: TRANSPORT_COLORS[type.name] }}
            >
              <h3 className="font-semibold">{type.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{type.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* latest alerts */}
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Latest Alerts</h2>
          <Link to="/alerts" className="text-sm font-semibold text-primary hover:underline">
            All alerts
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {alerts.state.status === 'loading' && <LoadingSpinner />}
          {alerts.state.status === 'error' && <ErrorMessage message={alerts.state.message} onRetry={alerts.reload} />}
          {alerts.state.status === 'success' && alerts.state.data.length === 0 && (
            <p className="text-slate-600">There are no active alerts right now.</p>
          )}
          {alerts.state.status === 'success' &&
            alerts.state.data.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      </section>
    </div>
  )
}
