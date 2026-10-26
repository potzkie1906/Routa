import { useId, useState } from 'react'
import type { FormEvent } from 'react'

interface RouteSearchProps {
  initialOrigin?: string
  initialDestination?: string
  // stop names offered while typing
  suggestions: string[]
  onSearch: (origin: string, destination: string) => void
  // when given, a "Clear" button is shown
  onClear?: () => void
}

/** Two inputs (origin and destination) and a Search button. */
export default function RouteSearch({
  initialOrigin = '',
  initialDestination = '',
  suggestions,
  onSearch,
  onClear,
}: RouteSearchProps) {
  const baseId = useId()
  const listId = `${baseId}-stops`
  const [origin, setOrigin] = useState(initialOrigin)
  const [destination, setDestination] = useState(initialDestination)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const from = origin.trim()
    const to = destination.trim()
    if (from === '' || to === '') {
      setError('Enter both an origin and a destination')
      return
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      setError('Origin and destination must be different')
      return
    }
    setError('')
    onSearch(from, to)
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-secondary/50'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="Find a route"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
        <div>
          <label htmlFor={`${baseId}-origin`} className="mb-1 block text-sm font-medium">
            Origin
          </label>
          <input
            id={`${baseId}-origin`}
            list={listId}
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="For example: Batangas"
            autoComplete="off"
            maxLength={100}
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap origin and destination"
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg hover:bg-slate-50"
        >
          &#8645;
        </button>

        <div>
          <label htmlFor={`${baseId}-destination`} className="mb-1 block text-sm font-medium">
            Destination
          </label>
          <input
            id={`${baseId}-destination`}
            list={listId}
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="For example: Batangas"
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-dark"
          >
            Search
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <datalist id={listId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Type a town or a stop name. Only active routes with a direct connection are searched (no transfers).
      </p>
    </form>
  )
}
