import { Fragment, useEffect } from 'react'
import type { LatLngTuple } from 'leaflet'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Route } from '../types/Route'
import type { Stop } from '../types/Stop'
import { colorForType } from '../utils/transportColors'
import StopMarker from './StopMarker'

interface MapViewProps {
  routes: Route[] // the routes to draw
  stops: Stop[] // the stops to draw
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

const DEFAULT_CENTER: LatLngTuple = [13.94, 121.16] // Lipa City
const DEFAULT_ZOOM = 11

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
  const importance = (route: Route) =>
    route.id === selectedRoute?.id ? 2 : highlightedRouteIds === null || highlightedRouteIds.has(route.id) ? 1 : 0
  const drawOrder = [...routes].sort((a, b) => importance(a) - importance(b))

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bounds={focusBounds} />
      <TapHandler onTap={onMapTap} />

      {/* route lines (a tap on a line reaches TapHandler, which finds every route there) */}
      {drawOrder
        .filter((route) => route.path.length >= 2)
        .map((route) => {
          const selected = route.id === selectedRoute?.id
          const dimmed = !selected && highlightedRouteIds !== null && !highlightedRouteIds.has(route.id)
          return (
            <Polyline
              key={route.id}
              positions={route.path.map((point): LatLngTuple => [point.latitude, point.longitude])}
              pathOptions={{
                color: colorForType(route.transportation.type),
                weight: selected ? 8 : dimmed ? 3 : 5,
                opacity: selected ? 1 : dimmed ? 0.2 : 0.8,
                // inactive and suspended routes are dashed
                dashArray: route.status === 'ACTIVE' ? undefined : '8 10',
              }}
            >
              <Tooltip sticky>{route.routeName}</Tooltip>
            </Polyline>
          )
        })}

        {/* the tapped routes along the real roads: a white casing under a bright line, drawn on top */}
          {routes
            .filter((route) => roadLines.has(route.id))
            .map((route) => {
              const line = roadLines.get(route.id) ?? []
              return (
                <Fragment key={`road-${route.id}`}>
                  <Polyline positions={line} interactive={false} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.9, lineCap: 'round' }} />
                  <Polyline
                    positions={line}
                    interactive={false}
                    pathOptions={{ color: colorForType(route.transportation.type), weight: 6, opacity: 1, lineCap: 'round' }}
                  />
                </Fragment>
              )
            })
          }

      {/* start and end of the selected route */}
      {selectedRoute && selectedRoute.stops.length >= 2 && (
        <>
          <CircleMarker
            center={[selectedRoute.stops[0].stop.latitude, selectedRoute.stops[0].stop.longitude]}
            radius={11}
            pathOptions={{ color: '#16a34a', weight: 4, fill: false }}
            interactive={false}
          />
          <CircleMarker
            center={[
              selectedRoute.stops[selectedRoute.stops.length - 1].stop.latitude,
              selectedRoute.stops[selectedRoute.stops.length - 1].stop.longitude,
            ]}
            radius={11}
            pathOptions={{ color: '#dc2626', weight: 4, fill: false }}
            interactive={false}
          />
        </>
      )}

      {/* where the user tapped a road */}
      {tapPoint && (
        <CircleMarker
          center={tapPoint}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 0.6 }}
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