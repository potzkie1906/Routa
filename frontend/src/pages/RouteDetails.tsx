import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import ReportForm from '../components/ReportForm'
import RouteDetails from '../components/RouteDetails'
import { useApiData } from '../hooks/useApiData'
import { useAuth } from '../hooks/useAuth'
import { addFavorite, getFavorites, removeFavorite } from '../services/favoriteService'
import { getRoute } from '../services/routeService'
import { parseApiError } from '../utils/apiError'

export default function RouteDetailsPage() {
  const { id } = useParams()
  const routeId = Number(id)

  if (!Number.isInteger(routeId) || routeId <= 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-bold">Route not found</h1>
        <Link to="/routes" className="mt-4 inline-block text-primary underline">
          Back to all routes
        </Link>
      </section>
    )
  }
  return <RouteDetailsLoader routeId={routeId} />
}

function RouteDetailsLoader({ routeId }: { routeId: number }) {
  const { isAuthenticated } = useAuth()
  const loadRoute = useCallback(() => getRoute(routeId), [routeId])
  const { state, reload } = useApiData(loadRoute)

  // ids of the routes the logged-in user saved (null = not loaded, or not logged in)
  const [favoriteIds, setFavoriteIds] = useState<Set<number> | null>(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    getFavorites()
      .then((routes) => {
        if (!cancelled) setFavoriteIds(new Set(routes.map((route) => route.id)))
      })
      .catch(() => {
        // not critical: the favorite button simply stays unavailable
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const isFavorite = favoriteIds?.has(routeId) ?? false

  const toggleFavorite = async () => {
    if (favoriteIds === null) return
    setFavoriteBusy(true)
    setFavoriteError('')
    try {
      if (isFavorite) {
        await removeFavorite(routeId)
      } else {
        await addFavorite(routeId)
      }
      setFavoriteIds((previous) => {
        const next = new Set(previous ?? [])
        if (isFavorite) next.delete(routeId)
        else next.add(routeId)
        return next
      })
    } catch (error) {
      setFavoriteError(parseApiError(error).message)
    } finally {
      setFavoriteBusy(false)
    }
  }

  if (state.status === 'loading') return <LoadingSpinner label="Loading route..." />
  if (state.status === 'error') {
    return (
      <section>
        <ErrorMessage message={state.message} onRetry={reload} />
        <Link to="/routes" className="mt-4 inline-block text-primary underline">
          Back to all routes
        </Link>
      </section>
    )
  }

  const route = state.data
  return (
    <div className="space-y-10">
      <Link to="/routes" className="text-sm text-primary hover:underline">
        &larr; All routes
      </Link>

      <RouteDetails route={route} />

      <section className="flex flex-wrap items-center gap-3">
        <Link
          to={`/map?route=${route.id}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          View on map
        </Link>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favoriteBusy || favoriteIds === null}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {isFavorite ? '\u2605 Remove from favorites' : '\u2606 Save to favorites'}
          </button>
        ) : (
          <Link to="/login" className="text-sm text-slate-600 underline">
            Log in to save this route
          </Link>
        )}
        {favoriteError && <span className="text-sm text-danger">{favoriteError}</span>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Report incorrect information</h2>
        <div className="mt-3">
          <ReportForm routeId={route.id} />
        </div>
      </section>
    </div>
  )
}
