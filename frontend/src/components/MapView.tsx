import { Fragment, useEffect, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Route } from '../types/Route'
import type { Stop } from '../types/Stop'
import type { CityBoundary } from '../utils/boundary'
import { isTerminal } from '../utils/stops'
import { colorForType } from '../utils/transportColors'
import BoundaryLayer from './BoundaryLayer'
import RouteArrows from './RouteArrows'
import { routeLineWidth } from '../utils/routeArrows'
import StopMarker from './StopMarker'
import { BRAND_COLORS } from '../utils/brandColors'

interface MapViewProps {
  routes: Route[] // the routes to draw
  stops: Stop[] // the stops to draw
  boundary: CityBoundary | null // the Batangas City outline (null while it loads)
  selectedRoute: Route | null
  selectedStopId: number | null // the tapped stop or terminal
  // routes found by a search (the others are dimmed); null when no search is active
  highlightedRouteIds: Set<number> | null
  focusBounds: LatLngTuple[] | null // the map zooms to show these points
  tapPoint: LatLngTuple | null // where the user tapped a road (a small ring is drawn there)
  roadLines: Map<number, LatLngTuple[]> // route id -> line along the roads, for the routes in the info card
  onMapTap: (latitude: number, longitude: number, zoom: number) => void
  onStopTap: (stop: Stop) => void
}

// Batangas City, used only until the boundary or the routes are loaded
const DEFAULT_CENTER: LatLngTuple = [13.76, 121.08]
const DEFAULT_ZOOM = 12

/** Zooms the map to show a set of points whenever that set changes. */
function FitBounds({ bounds }: { bounds: LatLngTuple[] | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, bounds])
  return null
}
/** Reports the zoom level after every zoom, so the city name can change size. */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoom(map.getZoom())
    },
  })
  return null
}

/** A tap anywhere on the map (also on a route line) is reported with its position and the zoom. */
function TapHandler({ onTap }: { onTap: MapViewProps['onMapTap'] }) {
  const map = useMapEvents({
    click(event) {
      onTap(event.latlng.lat, event.latlng.lng, map.getZoom())
    },
  })
  return null
}

export default function MapView({
  routes,
  stops,
  boundary,
  selectedRoute,
  selectedStopId,
  highlightedRouteIds,
  focusBounds,
  tapPoint,
  roadLines,
  onMapTap,
  onStopTap,
}: MapViewProps) {
  // Drawing order: dimmed routes first, then search results, and the selected route last (on top).
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const importance = (route: Route) =>
    route.id === selectedRoute?.id ? 2 : highlightedRouteIds === null || highlightedRouteIds.has(route.id) ? 1 : 0
  const drawOrder = [...routes].sort((a, b) => importance(a) - importance(b))

  return (
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="th-map h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="th-tiles-soft"
      />
      <FitBounds bounds={focusBounds} />
      <TapHandler onTap={onMapTap} />
      <ZoomWatcher onZoom={setZoom} />

      {/* the official city outline, under everything else */}
      {boundary && <BoundaryLayer boundary={boundary} zoom={zoom} />}

            {/* route lines, each drawn ONCE: the road line when there is one, else the stored line
          (a tap on a line reaches TapHandler, which finds every route there) */}
      {drawOrder
        .filter((route) => route.path.length >= 2)
        .map((route) => {
          const selected = route.id === selectedRoute?.id
          const dimmed = !selected && highlightedRouteIds !== null && !highlightedRouteIds.has(route.id)
          const width = routeLineWidth(zoom) // thicker as you zoom in
          const positions =
            roadLines.get(route.id) ?? route.path.map((point): LatLngTuple => [point.latitude, point.longitude])
          return (
            <Fragment key={route.id}>
              {/* a thin white edge so the line stays readable on any street */}
              {!dimmed && (
                <Polyline
                  positions={positions}
                  interactive={false}
                  pathOptions={{ color: '#ffffff', weight: width + 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
                />
              )}
              <Polyline
                positions={positions}
                pathOptions={{
                  // a route that is not running right now (inactive or suspended) is gray
                  color: route.currentStatus === 'ACTIVE' ? colorForType(route.transportation.type) : '#94a3b8',
                  weight: dimmed ? 2 : width,
                  opacity: selected ? 1 : dimmed ? 0.25 : 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              >
                <Tooltip sticky>{route.routeName}</Tooltip>
              </Polyline>
            </Fragment>
          )
        })}
      {/* direction arrows on the drawn route, on top of its line (more arrows as you zoom in) */}
      {routes
        .filter((route) => route.path.length >= 2)
        .map((route) => (
          <RouteArrows
            key={`arrows-${route.id}`}
            line={roadLines.get(route.id) ?? route.path.map((point): LatLngTuple => [point.latitude, point.longitude])}
          />
        ))}

      {/* start and end of the selected route, only where that end is a terminal
          (a circulating route has no fixed start or end, so it gets no rings) */}
      {selectedRoute && selectedRoute.stops.length >= 2 && (
        <>
          {isTerminal(selectedRoute.stops[0].stop) && (
            <CircleMarker
              center={[selectedRoute.stops[0].stop.latitude, selectedRoute.stops[0].stop.longitude]}
              radius={11}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: BRAND_COLORS.accent, fillOpacity: 0.8 }}
              interactive={false}
            />
          )}
          {isTerminal(selectedRoute.stops[selectedRoute.stops.length - 1].stop) && (
            <CircleMarker
              center={[
                selectedRoute.stops[selectedRoute.stops.length - 1].stop.latitude,
                selectedRoute.stops[selectedRoute.stops.length - 1].stop.longitude,
              ]}
              radius={11}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: BRAND_COLORS.accent, fillOpacity: 0.8 }}
              interactive={false}
            />
          )}
        </>
      )}

      {/* where the user tapped a road */}
      {tapPoint && (
        <CircleMarker
          center={tapPoint}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#6366f1', fillOpacity: 0.6 }}
          interactive={false}
        />
      )}

      {/* stops and terminals */}
      {stops.map((stop) => (
        <StopMarker key={stop.id} stop={stop} selected={stop.id === selectedStopId} onTap={onStopTap} />
      ))}
    </MapContainer>
  )
}