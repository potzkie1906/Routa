import { useCallback, useMemo, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import { Link, useSearchParams } from 'react-router'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import MapFilters from '../components/MapFilters'
import type { MapFilterState } from '../components/MapFilters'
import MapInfoCard from '../components/MapInfoCard'
import MapView from '../components/MapView'
import RouteSearch from '../components/RouteSearch'
import RouteSummary from '../components/RouteSummary'
import { useApiData } from '../hooks/useApiData'
import {useRoadLines} from '../hooks/useRoadLines'
import { getRoutes, searchRoutes } from '../services/routeService'
import { getStops } from '../services/stopService'
import type { Route } from '../types/Route'
import type { Stop } from '../types/Stop'
import { formatDuration, formatPeso } from '../utils/format'
import { colorForType } from '../utils/transportColors'
import type { TapInfo } from '../utils/mapTap'
import { routesNearPoint, tapToleranceMeters, tripsFromStop } from '../utils/mapTap'

const NO_ROUTES: Route[] = []
const NO_STOPS: Stop[] = []

// defined outside the component so the identity stays the same (see useApiData)
const loadAllRoutes = () => getRoutes()
const loadAllStops = () => getStops()

const INITIAL_FILTERS: MapFilterState = {
  types: { Bus: true, Jeepney: true, Van: true },
  showActive: true,
  showInactive: true,
}

function routeMatchesQuery(route: Route, query: string): boolean {
  if (query === '') return true
  const text = [route.routeName, route.routeCode, route.origin, route.destination, route.transportation.name]
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const routesData = useApiData(loadAllRoutes)
  const stopsData = useApiData(loadAllStops)

  const [filters, setFilters] = useState<MapFilterState>(INITIAL_FILTERS)
  const [query, setQuery] = useState('')
  // "View on map" on the route page opens this page with ?route=<id>
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(() => {
    const fromUrl = Number(searchParams.get('route'))
    return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : null
  })

// what the last tap on the map found (null = no card shown)
const [tapInfo, setTapInfo] = useState<TapInfo | null>(null)

  // ----- route search (the address looks like /map?origin=Lipa&destination=Batangas) -----
  const searchOrigin = searchParams.get('origin') ?? ''
  const searchDestination = searchParams.get('destination') ?? ''
  const searchActive = searchOrigin !== '' && searchDestination !== ''
  const loadSearch = useCallback(
    () => (searchActive ? searchRoutes(searchOrigin, searchDestination) : Promise.resolve<Route[]>([])),
    [searchActive, searchOrigin, searchDestination],
  )
  const search = useApiData(loadSearch)
  const searchResults = searchActive && search.state.status === 'success' ? search.state.data : NO_ROUTES
  const highlightedIds = useMemo(
    () => (searchActive && search.state.status === 'success' ? new Set(search.state.data.map((route) => route.id)) : null),
    [searchActive, search.state],
  )

  const allRoutes = routesData.state.status === 'success' ? routesData.state.data : NO_ROUTES
  const allStops = stopsData.state.status === 'success' ? stopsData.state.data : NO_STOPS

  // ----- what is shown, after the filters -----
  const visibleRoutes = useMemo(() => {
    const text = query.trim().toLowerCase()
    return allRoutes.filter((route) => {
      const typeAllowed = filters.types[route.transportation.type]
      const statusAllowed = route.status === 'ACTIVE' ? filters.showActive : filters.showInactive
      return typeAllowed && statusAllowed && routeMatchesQuery(route, text)
    })
  }, [allRoutes, filters, query])

  const visibleStops = useMemo(() => {
    // only stops that belong to at least one visible route
    const ids = new Set(visibleRoutes.flatMap((route) => route.stops.map((routeStop) => routeStop.stop.id)))
    return allStops.filter((stop) => ids.has(stop.id))
  }, [visibleRoutes, allStops])

  const selectedRoute = visibleRoutes.find((route) => route.id === selectedRouteId) ?? null
  const visibleIds = new Set(visibleRoutes.map((route) => route.id))

  // the map zooms to the selected route, else to the search results, else to all routes
  const focusBounds = useMemo<LatLngTuple[] | null>(() => {
    let source: Route[] = allRoutes
    if (selectedRoute) source = [selectedRoute]
    else if (searchResults.length > 0) source = searchResults
    const points = source.flatMap((route) =>
      route.path.map((point): LatLngTuple => [point.latitude, point.longitude]),
    )
    return points.length > 0 ? points : null
  }, [selectedRoute, searchResults, allRoutes])

        // ----- taps on the map -----

        // A terminal or stop: the routes that leave from it, with the stops you can reach.
  const handleStopTap = (stop: Stop) => {
    setTapInfo({ kind: 'stop', stop, trips: tripsFromStop(stop.id, visibleRoutes) })
  }
        // Anywhere else (a road): every visible route whose line passes within about 14 screen pixels.
  const handleMapTap = (latitude: number, longitude: number, zoom: number) => {
    const matches = routesNearPoint(visibleRoutes, latitude, longitude, tapToleranceMeters(zoom, latitude))
    setTapInfo({ kind: 'road', latitude, longitude, matches })
  }
    // ----- road lines for the routes in the card -----
  // the routes the card is about (useMemo keeps the same array until the next tap)
  const tappedRoutes = useMemo<Route[]>(() => {
    if (!tapInfo) return []
    return tapInfo.kind === 'road' ? tapInfo.matches.map((match) => match.route) : tapInfo.trips.map((trip) => trip.route)
  }, [tapInfo])
  const roadLines = useRoadLines(tappedRoutes)
  // ----- loading and errors -----
  if (routesData.state.status === 'loading' || stopsData.state.status === 'loading') {
    return <LoadingSpinner label="Loading the map data..." />
  }
  if (routesData.state.status === 'error') {
    return <ErrorMessage message={routesData.state.message} onRetry={routesData.reload} />
  }
  if (stopsData.state.status === 'error') {
    return <ErrorMessage message={stopsData.state.message} onRetry={stopsData.reload} />
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Map</h1>
        <p className="text-slate-600">
          Click a route line or a stop for details. All data is fictional demo data.
        </p>
      </div>

      <RouteSearch
        key={`${searchOrigin}|${searchDestination}`}
        initialOrigin={searchOrigin}
        initialDestination={searchDestination}
        suggestions={allStops.map((stop) => stop.name)}
        onSearch={(from, to) => setSearchParams({ origin: from, destination: to })}
        onClear={searchActive ? () => setSearchParams({}) : undefined}
      />

      <div>
        <label htmlFor="map-search" className="sr-only">
          Filter the routes on the map
        </label>
        <input
          id="map-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter the routes on the map (name, code, origin, destination, operator)"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ---------- side panel ---------- */}
        <aside className="space-y-4">
          {searchActive && (
            <div className="rounded-xl border border-primary/40 bg-blue-50 p-4 shadow-sm">
              <h2 className="text-sm font-semibold">
                Routes from {searchOrigin} to {searchDestination}
              </h2>
              {search.state.status === 'loading' && <p className="mt-2 text-sm text-slate-600">Searching...</p>}
              {search.state.status === 'error' && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {search.state.message}
                </p>
              )}
              {search.state.status === 'success' && search.state.data.length === 0 && (
                <p className="mt-2 text-sm text-slate-700">
                  No direct routes found. Try other stop names. Routes that need a transfer are not searched yet.
                </p>
              )}
              {search.state.status === 'success' && search.state.data.length > 0 && (
                <>
                  <p className="mt-1 text-xs text-slate-600">The other routes are dimmed on the map.</p>
                  <ul className="mt-2 space-y-1">
                    {search.state.data.map((route) => (
                      <li key={route.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRouteId(route.id)}
                          className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white ${
                            route.id === selectedRoute?.id ? 'bg-white font-semibold' : ''
                          }`}
                        >
                          <span
                            className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                            style={{ backgroundColor: colorForType(route.transportation.type) }}
                          />
                          {route.routeName}
                          <span className="block pl-5 text-xs font-normal text-slate-600">
                            {formatPeso(route.estimatedFare)} &middot; {formatDuration(route.estimatedMinutes)}
                            {!visibleIds.has(route.id) && ' \u00b7 hidden by the filters'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <MapFilters filters={filters} onChange={setFilters} />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Routes ({visibleRoutes.length})</h2>
            {visibleRoutes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No routes match the filters.</p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {visibleRoutes.map((route) => (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRouteId(route.id === selectedRouteId ? null : route.id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                        route.id === selectedRoute?.id ? 'bg-primary/10 font-semibold' : 'hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: colorForType(route.transportation.type) }}
                      />
                      <span className="flex-1">{route.routeName}</span>
                      {route.status !== 'ACTIVE' && <span className="text-xs text-slate-500">{route.status.toLowerCase()}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ---------- map and selected route ---------- */}
        <div className="space-y-4">
          {/* "isolate" keeps the map's controls below the sticky navigation bar */}
          <div className="relative isolate h-[60vh] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <MapView
              routes={visibleRoutes}
              stops={visibleStops}
              selectedRoute={selectedRoute}
              selectedStopId={tapInfo?.kind === 'stop' ? tapInfo.stop.id : null}
              highlightedRouteIds={highlightedIds}
              focusBounds={focusBounds}
              tapPoint={tapInfo?.kind === 'road' ? [tapInfo.latitude, tapInfo.longitude] : null}
              roadLines={roadLines.lines}
              onMapTap={handleMapTap}
              onStopTap={handleStopTap}
            />
              
            {tapInfo && (
              <div className="absolute inset-x-3 bottom-3 z-[1000] flex max-h-[70%] sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-24px)] sm:w-[320px]">
                <MapInfoCard 
                  info={tapInfo} 
                  status={roadLines.loading ? 'Drawing the road lines...' : undefined}
                  onClose={() => setTapInfo(null)} 
                  onShowRoute={setSelectedRouteId} 
                />
              </div>
            )}
          </div>

          {selectedRoute ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <RouteSummary route={selectedRoute} />
              <button
                type="button"
                onClick={() => setSelectedRouteId(null)}
                className="mt-3 text-sm font-medium text-slate-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a route to see its details here.{' '}
              <Link to="/routes" className="text-primary underline">
                Browse the route list
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
