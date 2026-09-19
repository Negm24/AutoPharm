/**
 * Relative by default: the Vite dev proxy and the nginx reverse proxy both mount the
 * backend at /api, and neither the backend origin nor the terminal key is ever compiled
 * into the client bundle.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 12000)

export const TERMINAL_KEY_HEADER = 'X-Terminal-Key'
export const KIOSK_SESSION_HEADER = 'X-Kiosk-Session'
