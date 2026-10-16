import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import FormField from '../components/FormField'
import Logo from '../components/Logo'
import { useAuth } from '../hooks/useAuth'
import { parseApiError } from '../utils/apiError'
import { validateEmail, validatePassword, validateRequired } from '../utils/validation'

interface RegisterErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function Register() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError('')

    const newErrors: RegisterErrors = {
      fullName: validateRequired(fullName, 'Full name'),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: confirmPassword === password ? '' : 'Passwords do not match',
    }
    setErrors(newErrors)
    if (Object.values(newErrors).some((message) => message)) return

    setSubmitting(true)
    try {
      await register(fullName.trim(), email.trim(), password)
      navigate('/', { replace: true })
    } catch (error) {
      // The backend checks everything again. Show its field messages under the matching inputs.
      const parsed = parseApiError(error)
      setErrors({
        fullName: parsed.fieldErrors.fullName,
        email: parsed.fieldErrors.email,
        password: parsed.fieldErrors.password,
      })
      setServerError(parsed.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <Logo className="mb-6 h-10 w-auto" />
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="mt-1 text-slate-600">Save favorite routes and report wrong information.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}
        <FormField id="fullName" label="Full name" value={fullName} onChange={setFullName}
          error={errors.fullName} autoComplete="name" />
        <FormField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" />
        <FormField id="password" label="Password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="new-password" />
        <p className="-mt-2 text-xs text-slate-500">
          8 to 72 characters, with at least one letter and one number.
        </p>
        <FormField id="confirmPassword" label="Confirm password" type="password" value={confirmPassword}
          onChange={setConfirmPassword} error={errors.confirmPassword} autoComplete="new-password" />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary underline">
          Log in
        </Link>
      </p>
    </section>
  )
}
