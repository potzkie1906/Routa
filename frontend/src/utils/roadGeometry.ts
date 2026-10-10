// Road-following lines for the routes the user tapped, from OSRM (a free routing service built on
// OpenStreetMap). Only used for routes whose stored line is still straight between stops.
import type { Route } from '../types/Route'
import { isApproximateLine } from './routeLine'

/** [latitude, longitude], the order Leaflet uses (OSRM answers [longitude, latitude]). */
export type LatLng = [number, number]

// Free public demo server: light use only (it asks for at most about 1 request per second).
export const OSRM_URL = 'https://router.project-osrm.org'

/** The OSRM address for driving through the stops in order. OSRM wants "longitude,latitude". */
export function osrmRouteUrl(route: Route, base = OSRM_URL): string {
  // 6 decimals (about 10 cm) keeps the address short and avoids float noise like 121.11999999999999
  const round = (value: number) => Number(value.toFixed(6))
  const points = route.stops.map((routeStop) => `${round(routeStop.stop.longitude)},${round(routeStop.stop.latitude)}`).join(';')
  return `${base}/route/v1/driving/${points}?overview=full&geometries=geojson`
}

/** Reads the line out of an OSRM answer, as [latitude, longitude] points. null = no usable line. */
export function parseOsrmLine(json: unknown): LatLng[] | null {
  const data = json as { code?: unknown; routes?: { geometry?: { coordinates?: unknown } }[] }
  const coordinates = data?.code === 'Ok' ? data.routes?.[0]?.geometry?.coordinates : undefined
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const line: LatLng[] = []
  for (const point of coordinates) {
    if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') return null
    line.push([point[1], point[0]])
  }
  return line
}

// One request per route per page visit: the answer (or the failure) is remembered.
const cache = new Map<number, Promise<LatLng[] | null>>()

/** The road line of a route: its stored line if that already follows roads, else asked from OSRM. */
export function roadLineOf(route: Route): Promise<LatLng[] | null> {
  if (route.stops.length < 2) return Promise.resolve(null)
  if (!isApproximateLine(route)) {
    // the road tool already stored a road line for this route: no request needed
    return Promise.resolve(route.path.map((point): LatLng => [point.latitude, point.longitude]))
  }
  let answer = cache.get(route.id)
  if (!answer) {
    answer = fetch(osrmRouteUrl(route), { signal: AbortSignal.timeout(8000) })
      .then((response) => (response.ok ? response.json() : null))
      .then(parseOsrmLine)
      .catch(() => null) // offline, too slow, or refused: the map keeps the stored line
    cache.set(route.id, answer)
  }
  return answer
}