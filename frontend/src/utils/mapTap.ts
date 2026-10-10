// What a tap on the map means. Pure functions (no React, no Leaflet), so they are easy to test.
import type { Route } from '../types/Route'
import type { Stop } from '../types/Stop'

/** A route whose line passes close to the tapped point. */
export interface RoadMatch {
  route: Route
  distanceM: number // meters from the tap to the nearest part of the line
}

/** One stop you can reach from the tapped stop on one route. */
export interface Destination {
  stop: Stop
  minutes: number // riding time from the tapped stop
}

/** A route that leaves from the tapped stop, and where it can take you. */
export interface StopTrip {
  route: Route
  destinations: Destination[]
}

/** What the info card shows: the routes on a road, or the trips from a stop. */
export type TapInfo =
  | { kind: 'road'; latitude: number; longitude: number; matches: RoadMatch[] }
  | { kind: 'stop'; stop: Stop; trips: StopTrip[] }

const METERS_PER_DEGREE = 111_320

/** How far a tap may be from a line and still "hit" it: about `pixels` on screen at this zoom. */
export function tapToleranceMeters(zoom: number, latitude: number, pixels = 14): number {
  // Web map tiles: one pixel is 156543 m at zoom 0 at the equator, half as much at each zoom level
  const metersPerPixel = (156_543.03 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom
  return pixels * metersPerPixel
}

/** Distance in meters from point p to the segment a-b (flat map around p; fine for short distances). */
export function distanceToSegmentM(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const lonScale = METERS_PER_DEGREE * Math.cos((p[0] * Math.PI) / 180)
  const ax = (a[1] - p[1]) * lonScale
  const ay = (a[0] - p[0]) * METERS_PER_DEGREE
  const bx = (b[1] - p[1]) * lonScale
  const by = (b[0] - p[0]) * METERS_PER_DEGREE
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  // t = how far along the segment the closest point is (0 = at a, 1 = at b)
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared))
  return Math.hypot(ax + t * dx, ay + t * dy)
}

/** Every route whose line passes within maxMeters of the point, nearest first. */
export function routesNearPoint(routes: Route[], latitude: number, longitude: number, maxMeters: number): RoadMatch[] {
  const p: [number, number] = [latitude, longitude]
  const matches: RoadMatch[] = []
  for (const route of routes) {
    let best = Infinity
    for (let i = 1; i < route.path.length; i++) {
      const a = route.path[i - 1]
      const b = route.path[i]
      best = Math.min(best, distanceToSegmentM(p, [a.latitude, a.longitude], [b.latitude, b.longitude]))
    }
    if (best <= maxMeters) matches.push({ route, distanceM: best })
  }
  return matches.sort((x, y) => x.distanceM - y.distanceM)
}

/**
 * Every route that stops at this stop and continues after it, with the later stops and the
 * minutes to reach each one (from minutesFromStart). Active routes first, then by name.
 */
export function tripsFromStop(stopId: number, routes: Route[]): StopTrip[] {
  const trips: StopTrip[] = []
  for (const route of routes) {
    const index = route.stops.findIndex((routeStop) => routeStop.stop.id === stopId)
    if (index === -1 || index === route.stops.length - 1) continue // not on this route, or its last stop
    const start = route.stops[index].minutesFromStart
    trips.push({
      route,
      destinations: route.stops.slice(index + 1).map((routeStop) => ({
        stop: routeStop.stop,
        minutes: routeStop.minutesFromStart - start,
      })),
    })
  }
  return trips.sort(
    (a, b) =>
      Number(b.route.status === 'ACTIVE') - Number(a.route.status === 'ACTIVE') ||
      a.route.routeName.localeCompare(b.route.routeName),
  )
}