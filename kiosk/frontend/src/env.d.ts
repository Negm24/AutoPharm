/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Relative by default so the dev proxy and the nginx reverse proxy both work. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS?: string
  /** QR sign-in needs an optional scanner peripheral, so it is opt-in. */
  readonly VITE_AUTH_QR_ENABLED?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
