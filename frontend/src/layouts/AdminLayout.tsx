import { Outlet, useNavigate } from 'react-router'
import Logo from '../components/Logo'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

// Every admin page is shown inside this frame: a top bar and the Sidebar.
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <Logo variant="white" className="h-7 w-auto" />
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">Admin</span>
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{user?.fullName}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
