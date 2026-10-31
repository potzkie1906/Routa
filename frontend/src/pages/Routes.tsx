import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import RouteCard from '../components/RouteCard'
import RouteSearch from '../components/RouteSearch'
import SearchResults from '../components/SearchResults'
import { useApiData } from '../hooks/useApiData'
import { getRoutes } from '../services/routeService'
import { getStops } from '../services/stopService'
import type { RouteStatus } from '../types/Route'

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'BUS', label: 'Bus' },
  { value: 'JEEPNEY', label: 'Jeepney' },
  { value: 'VAN', label: 'Van' },
]

const statusOptions: { value: '' | RouteStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const loadStops = () => getStops()

export default function RoutesPage() {
  // The search lives in the address (/routes?origin=Lipa&destination=Batangas),
  // so a search can be shared and the browser's Back button works.
  const [searchParams, setSearchParams] = useSearchParams()
  const origin = searchParams.get('origin') ?? ''
  const destination = searchParams.get('destination') ?? ''
  const searching = origin !== '' && destination !== ''

  const stops = useApiData(loadStops)
  const stopNames = stops.state.status === 'success' ? stops.state.data.map((stop) => stop.name) : []

  return (
    <section>
      <h1 className="text-2xl font-bold">Routes</h1>
      <p className="mt-1 text-slate-600">Find a route between two places, or browse all routes.</p>

      <div className="mt-6">
        {/* key: when the address changes (for example with Back), the form shows the new values */}
        <RouteSearch
          key={`${origin}|${destination}`}
          initialOrigin={origin}
          initialDestination={destination}
          suggestions={stopNames}
          onSearch={(from, to) => setSearchParams({ origin: from, destination: to })}
          onClear={searching ? () => setSearchParams({}) : undefined}
        />
      </div>

      <div className="mt-8">
        {searching ? <SearchResults origin={origin} destination={destination} /> : <AllRoutes />}
      </div>
    </section>
  )
}

/** The browsable list of every route, with type and status filters. */
function AllRoutes() {
  const [type, setType] = useState('')
  const [status, setStatus] = useState<'' | RouteStatus>('')

  // a new function (and so a new request) is created only when the type changes
  const loadRoutes = useCallback(() => getRoutes({ type: type || undefined }), [type])
  const { state, reload } = useApiData(loadRoutes)
  // the status filter uses the status right now (from the operating hours), like the badges
  const routes =
    state.status === 'success' ? state.data.filter((route) => status === '' || route.currentStatus === status) : []

  return (
    <div>
      <h2 className="text-xl font-semibold">All routes</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="type-filter" className="mb-1 block text-sm font-medium">
            Type
          </label>
          <select
            id="type-filter"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as '' | RouteStatus)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {state.status === 'loading' && <LoadingSpinner label="Loading routes..." />}
        {state.status === 'error' && <ErrorMessage message={state.message} onRetry={reload} />}
        {state.status === 'success' && routes.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No routes match these filters.
          </p>
        )}
        {state.status === 'success' && routes.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600">{routes.length} route(s)</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
