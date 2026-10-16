import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import Logo from './Logo'

const mainLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/map', label: 'Map', end: false },
  { to: '/routes', label: 'Routes', end: false },
  { to: '/alerts', label: 'Alerts', end: false },
]

function linkClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
      ? 'bg-white/10 text-white underline decoration-accent decoration-2 underline-offset-8'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`
}

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    logout()
    closeMenu()
    navigate('/')
  }

  // The same links are used in the desktop bar and in the mobile menu.
  const links = (
    <>
      {mainLinks.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={closeMenu}>
          {link.label}
        </NavLink>
      ))}
    </>
  )

  const accountLinks = isAuthenticated ? (
    <>
      {isAdmin && (
        <NavLink to="/admin" className={linkClass} onClick={closeMenu}>
          Admin
        </NavLink>
      )}
      <NavLink to="/favorites" className={linkClass} onClick={closeMenu}>
        Favorites
      </NavLink>
      <NavLink to="/profile" className={linkClass} onClick={closeMenu}>
        {user?.fullName}
      </NavLink>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
      >
        Log out
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" className={linkClass} onClick={closeMenu}>
        Log in
      </NavLink>
      <Link
        to="/register"
        onClick={closeMenu}
        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-white/90"
      >
        Sign up
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-[1000] bg-primary text-white shadow">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link to="/" className="shrink-0" onClick={closeMenu}>
          <Logo variant="white" className="h-8 w-auto" />
        </Link>

        {/* desktop */}
        <div className="hidden items-center gap-1 md:flex">{links}</div>
        <div className="hidden items-center gap-1 md:flex">{accountLinks}</div>

        {/* mobile menu button */}
        <button
          type="button"
          className="rounded-md p-2 hover:bg-white/10 md:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="block h-0.5 w-6 bg-white" />
          <span className="mt-1.5 block h-0.5 w-6 bg-white" />
          <span className="mt-1.5 block h-0.5 w-6 bg-white" />
        </button>
      </nav>

      {/* mobile menu */}
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
          {links}
          <div className="my-1 border-t border-white/10" />
          {accountLinks}
        </div>
      )}
    </header>
  )
}
