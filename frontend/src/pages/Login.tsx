import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import FormField from '../components/FormField'
import Logo from '../components/Logo'
import { useAuth } from '../hooks/useAuth'
import { parseApiError } from '../utils/apiError'
import { validateEmail, validateRequired } from '../utils/validation'

// ProtectedRoute stores the page the user wanted in location.state.from
function pathToReturnTo(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from
    if (typeof from === 'string' && from.startsWith('/')) return from
  }
  return '/'
}

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError('')

    const newErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    }
    setErrors(newErrors)
    if (newErrors.email || newErrors.password) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(pathToReturnTo(location.state), { replace: true })
    } catch (error) {
      setServerError(parseApiError(error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <Logo className="mb-6 h-10 w-auto" />
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-slate-600">Welcome back to Routa.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}
        <FormField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" />
        <FormField id="password" label="Password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="current-password" />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-primary underline">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        Demo accounts: admin@routa.local and user@routa.local.
      </p>
    </section>
  )
}
