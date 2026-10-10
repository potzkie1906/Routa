import type { Route } from '../types/Route'
import { distanceKm } from './geo'

const SAME_PLACE_KM = 0.015 // 15 m

/**
 * True when the stored map line only connects the route's stops with straight segments
 * (every point of the line is one of its stops). Such a line does NOT follow the roads.
 * After the road tool (database/tools) is run, the line has points along the roads and this returns false.
 */
export function isApproximateLine(route: Route): boolean {
  if (route.path.length < 2) return false
  return route.path.every((point) =>
    route.stops.some(
      (routeStop) =>
        distanceKm(point.latitude, point.longitude, routeStop.stop.latitude, routeStop.stop.longitude) <= SAME_PLACE_KM,
    ),
  )
}