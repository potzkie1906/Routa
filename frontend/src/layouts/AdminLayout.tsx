import { Link, Outlet, useLocation } from 'react-router'
import Logo from '../components/Logo'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

// Every admin page is shown inside this frame: a top bar and the Sidebar.
export default function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <Logo variant="white" className="h-7 w-auto" />
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">Admin</span>
          </span>
          {/* Log out is on the Profile page now; the name opens it */}
          <Link to="/profile" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-white/10">
            {user?.fullName}
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}