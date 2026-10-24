import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// The Routa loader from index.html covers the screen while the app starts.
// Keep it until the pin has landed and the route line is drawn (1.6 seconds after the
// page started loading), then fade it out and remove it.
const splash = document.getElementById('splash')
if (splash) {
  const wait = Math.max(0, 1600 - performance.now())
  window.setTimeout(() => {
    splash.classList.add('splash-hide')
    window.setTimeout(() => splash.remove(), 400)
  }, wait)
}
