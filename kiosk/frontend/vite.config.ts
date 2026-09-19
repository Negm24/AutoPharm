import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // The empty prefix loads every variable, not only VITE_*, so KIOSK_TERMINAL_KEY is
  // readable here in Node and is never emitted into the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.KIOSK_API_ORIGIN || 'http://127.0.0.1:8000'
  const terminalKey = env.KIOSK_TERMINAL_KEY || ''

  // The backend authenticates the terminal, not the browser: every /api/v1/auth/kiosk/*
  // call needs an X-Terminal-Key header, and Terminal's own docstring forbids putting that
  // secret in browser JavaScript. The dev proxy injects it exactly as nginx does in prod.
  const apiProxy: ProxyOptions = {
    target: backendOrigin,
    changeOrigin: true,
    secure: false,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (terminalKey) {
          proxyReq.setHeader('X-Terminal-Key', terminalKey)
        }
      })
    },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': apiProxy },
    },
    preview: {
      proxy: { '/api': apiProxy },
    },
  }
})
