import { useSessionStore } from '../session/sessionStore'
import { useAuthStore } from './authStore'
import { SESSION_HEARTBEAT_MS } from './constants'

/**
 * Keeps the backend's kiosk session in step with Feature 1's on-screen session, without
 * editing Feature 1's store.
 *
 * The two are different things: `sessionStore` is the countdown the customer sees, while
 * `/api/v1/auth/kiosk/sessions/*` is a real server resource that owns the OTP challenges
 * and the access token. Mirroring them here means neither feature has to know about the
 * other, and satisfies FR-4 ("destroy all session state") and FR-5 ("never resumable")
 * on the server as well as in the browser.
 *
 * Imported for its side effect by `features/auth/routes.tsx`, so it is installed before
 * any auth screen can render.
 */

let installed = false
let heartbeat: ReturnType<typeof setInterval> | null = null

function stopHeartbeat() {
  if (heartbeat !== null) {
    clearInterval(heartbeat)
    heartbeat = null
  }
}

function startHeartbeat() {
  stopHeartbeat()
  // sessions/extend/ is both the idle-timer extension (FR-3) and, while signed in, the
  // only way to renew the 180-second access token. The kiosk has no refresh token.
  heartbeat = setInterval(() => {
    void useAuthStore.getState().extendServerSession()
  }, SESSION_HEARTBEAT_MS)
}

export function installKioskSessionBridge(): void {
  if (installed) {
    return
  }
  installed = true

  const auth = useAuthStore.getState()
  const current = useSessionStore.getState().session
  if (current) {
    void auth.startServerSession(current.lang)
    startHeartbeat()
  }

  useSessionStore.subscribe((state, previous) => {
    const before = previous.session
    const after = state.session

    if (before && !after) {
      // Expiry or Start over. Identity and every challenge go with it (FR-4, FR-35).
      stopHeartbeat()
      void useAuthStore.getState().endServerSession()
      return
    }

    if (after && (!before || before.sessionId !== after.sessionId)) {
      // A fresh session means a fresh person at the terminal.
      useAuthStore.getState().hardReset()
      void useAuthStore.getState().startServerSession(after.lang)
      startHeartbeat()
    }
  })

  // A reload must not leave a usable token behind in a restored page.
  window.addEventListener('beforeunload', () => {
    useAuthStore.getState().hardReset()
  })
}
