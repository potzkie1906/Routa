import { Outlet, useLocation } from 'react-router'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

// Every public page is shown inside this frame: Navbar on top, Footer at the bottom.
export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* A new key for every new address: React draws the page again, so the fade-up plays again. */}
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}