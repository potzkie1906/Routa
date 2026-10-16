#!/usr/bin/env node
/**
 * Makes the route lines on the map follow real roads.
 *
 * What it does:
 *   1. Reads every route (with its stops, in order) from the running Routa backend.
 *   2. Asks a road-routing service (OSRM, built on OpenStreetMap data) for the road between the stops.
 *   3. Simplifies the result (removes points that are almost on a straight line) so the
 *      database does not store thousands of points.
 *   4. Writes a SQL file that replaces each route's stored line (table route_points) and moves each
 *      stop onto the nearest road. You review the file and apply it to the database yourself.
 *
 * The lines stay STORED in the database. The running application never calls a routing
 * service: only this one-time tool does. Needs Node.js 18 or newer, no libraries.
 *
 * Usage (from the project root, with the backend running):
 *   node database/tools/snap-routes-to-roads.mjs
 * Options:
 *   --api <url>          backend address            (default http://localhost:8080)
 *   --osrm <url>         routing service address    (default https://router.project-osrm.org)
 *   --out <file>         SQL file to write          (default database/seed/route-paths.sql)
 *   --tolerance-m <n>    simplification in meters   (default 4)
 *   --delay-ms <n>       pause between requests     (default 1200, be polite to the free server)
 *   --no-snap-stops      do not move the stops onto the road
 *   --through-line       follow the points of each route's stored line instead of only its stops
 *                        (for routes without fixed stops: put points along the right road in
 *                        route_points first). Uses OSRM "match", so no extra spur lines appear.
 *                        Stops are not moved in this mode.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const METERS_PER_DEGREE_LATITUDE = 110540
const METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111320
const WARN_IF_STOP_MOVES_MORE_THAN_M = 300
// a stored line with more points than this already follows the roads (the tool wrote it)
const MAX_GUIDE_POINTS = 90
// --through-line: how far (m) a hand-placed point may be from the road it belongs to
const MATCH_RADIUS_M = 45

export function parseArgs(argv) {
  const options = {
    api: 'http://localhost:8080',
    osrm: 'https://router.project-osrm.org',
    out: 'database/seed/route-paths.sql',
    toleranceM: 4,
    delayMs: 1200,
    snapStops: true,
    throughLine: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value after ${arg}`)
      return argv[++i]
    }
    if (arg === '--api') options.api = value()
    else if (arg === '--osrm') options.osrm = value()
    else if (arg === '--out') options.out = value()
    else if (arg === '--tolerance-m') options.toleranceM = Number(value())
    else if (arg === '--delay-ms') options.delayMs = Number(value())
    else if (arg === '--no-snap-stops') options.snapStops = false
    else if (arg === '--through-line') options.throughLine = true
    else throw new Error(`Unknown option ${arg}`)
  }
  if (!Number.isFinite(options.toleranceM) || options.toleranceM < 0) throw new Error('--tolerance-m must be a number >= 0')
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new Error('--delay-ms must be a number >= 0')
  return options
}

/** Straight-line distance in meters between two [latitude, longitude] points (haversine). */
export function distanceMeters(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const dLat = toRadians(b[0] - a[0])
  const dLon = toRadians(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/**
 * Douglas-Peucker line simplification. points: [[latitude, longitude], ...].
 * Keeps the first and last point and every point that bends the line by more than toleranceM meters.
 */
export function simplify(points, toleranceM) {
  if (points.length <= 2 || toleranceM <= 0) return points.slice()

  // flat map in meters around the first point (accurate enough for one route)
  const [lat0, lon0] = points[0]
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR * Math.cos((lat0 * Math.PI) / 180)
  const flat = points.map(([lat, lon]) => [(lon - lon0) * metersPerDegreeLongitude, (lat - lat0) * METERS_PER_DEGREE_LATITUDE])

  const distanceToSegment = (p, a, b) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const lengthSquared = dx * dx + dy * dy
    if (lengthSquared === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared))
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
  }

  const keep = new Array(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack = [[0, points.length - 1]] // no recursion: long routes cannot overflow the call stack
  while (stack.length > 0) {
    const [start, end] = stack.pop()
    let farthestIndex = -1
    let farthestDistance = toleranceM
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(flat[i], flat[start], flat[end])
      if (d > farthestDistance) {
        farthestDistance = d
        farthestIndex = i
      }
    }
    if (farthestIndex !== -1) {
      keep[farthestIndex] = true
      stack.push([start, farthestIndex], [farthestIndex, end])
    }
  }
  return points.filter((_, index) => keep[index])
}

const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlNumber = (value) => Number(value).toFixed(6)

/**
 * Builds the SQL file. results: [{ routeCode, routeName, points: [[lat, lon]...] }]
 * stopMoves: [{ name, from: [lat, lon], to: [lat, lon], movedM }]
 */
export function buildSql(results, stopMoves) {
  const lines = []
  lines.push('-- =====================================================================')
  lines.push('-- Route lines that follow real roads (generated by database/tools/snap-routes-to-roads.mjs).')
  lines.push('-- Road data: OpenStreetMap contributors, routed with OSRM. Demo data, not official information.')
  lines.push('-- Apply AFTER schema.sql and sample-data.sql. Safe to run again: it replaces the same lines.')
  lines.push('-- =====================================================================')
  lines.push('BEGIN;')
  lines.push('')

  if (stopMoves.length > 0) {
    lines.push('-- Stops moved onto the nearest road')
    for (const move of stopMoves) {
      lines.push(
        `UPDATE stops SET latitude = ${sqlNumber(move.to[0])}, longitude = ${sqlNumber(move.to[1])} ` +
          `WHERE name = ${sqlText(move.name)}; -- moved ${Math.round(move.movedM)} m`,
      )
    }
    lines.push('')
  }

  for (const result of results) {
    const routeId = `(SELECT id FROM routes WHERE route_code = ${sqlText(result.routeCode)})`
    lines.push(`-- ${result.routeName} (${result.routeCode}): ${result.points.length} points`)
    lines.push(`DELETE FROM route_points WHERE route_id = ${routeId};`)
    lines.push('INSERT INTO route_points (route_id, point_order, latitude, longitude)')
    lines.push(`SELECT ${routeId}, v.n, v.lat, v.lon FROM (VALUES`)
    lines.push(
      result.points.map(([lat, lon], n) => `  (${n}, ${sqlNumber(lat)}, ${sqlNumber(lon)})`).join(',\n'),
    )
    lines.push(') AS v(n, lat, lon);')
    lines.push('')
  }

  lines.push('COMMIT;')
  lines.push('')
  return lines.join('\n')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url, label) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'TransitHub-school-project/1.0', Accept: 'application/json' } })
      if (!response.ok) {
        // OSRM explains a refusal in the body, for example {"code":"NoSegment","message":"..."}
        let detail = ''
        try {
          const body = await response.json()
          detail = ` ${body.code ?? ''}${body.message ? `: ${body.message}` : ''}`
        } catch {
          // no JSON body
        }
        const error = new Error(`HTTP ${response.status}${detail}`)
        // 4xx = the request itself was refused: asking again gives the same answer
        if (response.status >= 400 && response.status < 500 && response.status !== 429) error.final = true
        throw error
      }
      return await response.json()
    } catch (error) {
      lastError = error
      if (error?.final) break
      if (attempt < 3) await sleep(attempt * 2000)
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : lastError}`)
}
/** Compass direction (0 = north, 90 = east) from point a to point b, in whole degrees. */
export function bearingDegrees(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

/** The driving direction at each point: from the point before it to the point after it. */
export function travelBearings(points) {
  return points.map((_, i) => {
    const from = points[Math.max(0, i - 1)]
    const to = points[Math.min(points.length - 1, i + 1)]
    return bearingDegrees(from, to)
  })
}

/**
 * --through-line fallback: the normal "route" service through every point, but each point may only
 * be placed on a road going in the driving direction (OSRM "bearings", +-60 degrees). On a divided
 * road that picks the correct carriageway, so it does not drive past and turn back.
 */
async function routeAlongPoints(osrm, points) {
  const coordinates = points.map((p) => `${p.longitude},${p.latitude}`).join(';')
  const bearings = travelBearings(points).map((b) => `${b},60`).join(';')
  const url = `${osrm}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&bearings=${bearings}`
  const data = await fetchJson(url, 'Routing request')
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`the routing service answered "${data.code}"${data.message ? `: ${data.message}` : ''}`)
  }
  return {
    points: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    snapped: [],
    distanceKm: data.routes[0].distance / 1000,
    durationMin: data.routes[0].duration / 60,
  }
}

/** --through-line: "match" first; if OSRM refuses it, "route" with driving directions. */
async function followPoints(osrm, points, routeCode) {
  try {
    return await matchThroughPoints(osrm, points)
  } catch (error) {
    console.warn(`     ${routeCode}: ${error.message}; trying the route service with driving directions`)
    return routeAlongPoints(osrm, points)
  }
}

/** Asks OSRM for the road through the stops. Returns the line and the snapped stop locations. */
async function routeThroughStops(osrm, stops) {
  const coordinates = stops.map((s) => `${s.longitude},${s.latitude}`).join(';') // OSRM wants longitude,latitude
  const url = `${osrm}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
  const data = await fetchJson(url, 'Routing request')
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`the routing service answered "${data.code}"${data.message ? `: ${data.message}` : ''}`)
  }
  return {
    points: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    snapped: (data.waypoints ?? []).map((w) => [w.location[1], w.location[0]]),
    distanceKm: data.routes[0].distance / 1000,
    durationMin: data.routes[0].duration / 60,
  }
}
/**
 * --through-line: follows the hand-placed points like a GPS trace (the OSRM "match" service).
 * The "route" service must drive exactly through every point: a point on the wrong side of a
 * divided road makes it drive past, turn around and come back, which draws short extra lines
 * (spurs). "match" may move each point up to MATCH_RADIUS_M onto the lane that fits the direction
 * of travel, so the line has no spurs.
 */
async function matchThroughPoints(osrm, points) {
  const coordinates = points.map((p) => `${p.longitude},${p.latitude}`).join(';')
  const radiuses = points.map(() => MATCH_RADIUS_M).join(';')
  const url =
    `${osrm}/match/v1/driving/${coordinates}?overview=full&geometries=geojson` +
    `&radiuses=${radiuses}&gaps=ignore&tidy=true`
  const data = await fetchJson(url, 'Matching request')
  if (data.code !== 'Ok' || !data.matchings?.length) {
    throw new Error(`the matching service answered "${data.code}"${data.message ? `: ${data.message}` : ''}`)
  }
  if (data.matchings.length > 1) {
    console.warn(`WARN the line was matched in ${data.matchings.length} pieces; add a point where the pieces meet`)
  }
  return {
    points: data.matchings.flatMap((m) => m.geometry.coordinates.map(([lon, lat]) => [lat, lon])),
    snapped: [],
    distanceKm: data.matchings.reduce((sum, m) => sum + m.distance, 0) / 1000,
    durationMin: data.matchings.reduce((sum, m) => sum + m.duration, 0) / 60,
  }
}

export async function main(argv) {
  const options = parseArgs(argv)
  console.log(`Reading routes from ${options.api} ...`)
  let routes
  try {
    routes = await fetchJson(`${options.api}/api/routes`, 'Reading the routes')
  } catch (error) {
    throw new Error(`${error.message}\nIs the backend running? Start it with ./mvnw spring-boot:run in backend/.`)
  }
  if (!Array.isArray(routes) || routes.length === 0) throw new Error('The backend returned no routes. Load the sample data first.')

  const results = []
  const stopMoves = new Map() // stop name -> move, the first route that uses a stop decides where it goes
  const failures = []

  for (const [index, route] of routes.entries()) {
    const stops = route.stops.map((rs) => rs.stop)
    if (stops.length < 2) continue
    // --through-line: follow the hand-placed points of the stored line, so the road is the one you chose
    const guide = route.path ?? []
    const useLine = options.throughLine && guide.length >= 2
    if (useLine && guide.length > MAX_GUIDE_POINTS) {
      console.log(`SKIP ${route.routeCode.padEnd(12)} its line already has ${guide.length} points (it follows the roads)`)
      continue
    }
    try {
      if (index > 0) await sleep(options.delayMs)
            const road = useLine ? await followPoints(options.osrm, guide, route.routeCode) : await routeThroughStops(options.osrm, stops)
      const points = simplify(road.points, options.toleranceM)
      results.push({ routeCode: route.routeCode, routeName: route.routeName, points })

      if (options.snapStops && !useLine) {
        stops.forEach((stop, i) => {
          if (!road.snapped[i] || stopMoves.has(stop.name)) return
          const movedM = distanceMeters([stop.latitude, stop.longitude], road.snapped[i])
          stopMoves.set(stop.name, { name: stop.name, from: [stop.latitude, stop.longitude], to: road.snapped[i], movedM })
        })
      }
      console.log(
        `OK   ${route.routeCode.padEnd(12)} ${road.points.length} -> ${points.length} points; ` +
          `road ${road.distanceKm.toFixed(1)} km, ${Math.round(road.durationMin)} min ` +
          `(stored: ${route.distanceKm} km, ${route.estimatedMinutes} min, left unchanged)`,
      )
    } catch (error) {
      failures.push(route.routeCode)
      console.error(`FAIL ${route.routeCode}: ${error.message}`)
    }
  }

  if (results.length === 0) throw new Error('No route could be processed. Check your internet connection.')

  const moves = [...stopMoves.values()]
  for (const move of moves.filter((m) => m.movedM > WARN_IF_STOP_MOVES_MORE_THAN_M)) {
    console.warn(`WARN stop "${move.name}" moves ${Math.round(move.movedM)} m. Check that it is the right road before applying.`)
  }

  await mkdir(dirname(options.out), { recursive: true })
  await writeFile(options.out, buildSql(results, moves), 'utf8')
  console.log(`\nWrote ${options.out} (${results.length} routes, ${moves.length} stops).`)
  if (failures.length > 0) {
    console.error(`Not done: ${failures.join(', ')}. Run the tool again to retry (it rewrites the whole file).`)
    return 1
  }
  return 0
}

// run only when started from the command line (not when imported by a test)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`\nError: ${error.message}`)
      process.exit(1)
    },
  )
}
