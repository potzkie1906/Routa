import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Puts a Content-Security-Policy into the built index.html (npm run build only).
 * The browser then loads scripts only from our own site and talks only to the
 * addresses listed here, so injected code could not load or send anything.
 * "npm run dev" skips it, because the dev server needs inline scripts for hot reload.
 */
function contentSecurityPolicy(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://tile.openstreetmap.org",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://router.project-osrm.org`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'routa-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // the same backend address that src/services/api.ts uses
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = new URL(env.VITE_API_BASE_URL || 'http://localhost:8080').origin

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(apiOrigin)],
  }
})