import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { submitReport } from '../services/reportService'
import { parseApiError } from '../utils/apiError'

const MAX_LENGTH = 1000

/** Lets a logged-in user report wrong information about a route. */
export default function ReportForm({ routeId }: { routeId: number }) {
  const { isAuthenticated } = useAuth()
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-slate-600">
        <Link to="/login" className="font-medium text-primary underline">
          Log in
        </Link>{' '}
        to report incorrect information about this route.
      </p>
    )
  }

  if (sent) {
    return <p className="rounded-lg bg-green-50 px-4 py-3 text-green-800">Thank you! Your report was sent to the administrators.</p>
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (description.trim() === '') {
      setError('Please describe what is wrong')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await submitReport({ routeId, description: description.trim() })
      setSent(true)
    } catch (caught) {
      setError(parseApiError(caught).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <label htmlFor="report-description" className="block text-sm font-medium">
        What is wrong with this route?
      </label>
      <textarea
        id="report-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder="For example: the fare is now higher, or a stop has moved."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-secondary/50"
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {description.length}/{MAX_LENGTH}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Send report'}
      </button>
    </form>
  )
}
