import { startTransition, useState } from 'react'
import { useNavigate } from 'react-router'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  if (!user) return null // ProtectedRoute makes sure this does not happen

  // Runs only when "Log out" is clicked a second time, inside the dialog.
  const handleLogout = async () => {
    // One screen update for both changes: go to Home AND forget the user. Done one after
    // the other, ProtectedRoute would see the logout first and open the Log in page instead.
    startTransition(() => {
      navigate('/', { replace: true })
      logout()
    })
  }

  const rows = [
    { label: 'Full name', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role === 'ADMIN' ? 'Administrator' : 'User' },
    { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString() },
  ]

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">My profile</h1>
      <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => setConfirmingLogout(true)}
        className="mt-6 w-full rounded-lg border border-danger px-4 py-2 font-semibold text-danger hover:bg-red-50 sm:w-auto"
      >
        Log out
      </button>

      {confirmingLogout && (
        <ConfirmDialog
          title="Log out of Routa?"
          message="Your favorite routes stay saved. You will need your email and password to log in again."
          confirmLabel="Log out"
          onConfirm={handleLogout}
          onClose={() => setConfirmingLogout(false)}
        />
      )}
    </section>
  )
}