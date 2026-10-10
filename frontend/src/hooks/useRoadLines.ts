import { useEffect, useState } from 'react'
import type { Route } from '../types/Route'
import type { LatLng } from '../utils/roadGeometry'
import { roadLineOf } from '../utils/roadGeometry'

const NO_LINES = new Map<number, LatLng[]>()

/**
 * Road lines for the given routes (route id -> points). While they load, `loading` is true and
 * the map shows the stored lines. A route whose road line cannot be fetched is simply left out.
 * `routes` must keep the same identity between renders (useMemo), like the fetchers of useApiData.
 */
export function useRoadLines(routes: Route[]) {
  const key = routes.map((route) => route.id).join(',')
  const [result, setResult] = useState<{ key: string; lines: Map<number, LatLng[]> }>({ key: '', lines: NO_LINES })

  useEffect(() => {
    let cancelled = false // ignore the answer if the user tapped somewhere else meanwhile
    Promise.all(routes.map(async (route) => [route.id, await roadLineOf(route)] as const)).then((answers) => {
      if (cancelled) return
      const lines = new Map<number, LatLng[]>()
      for (const [id, line] of answers) if (line) lines.set(id, line)
      setResult({ key: routes.map((route) => route.id).join(','), lines })
    })
    return () => {
      cancelled = true
    }
  }, [routes])

  const ready = result.key === key
  return { lines: ready ? result.lines : NO_LINES, loading: !ready && routes.length > 0 }
}
