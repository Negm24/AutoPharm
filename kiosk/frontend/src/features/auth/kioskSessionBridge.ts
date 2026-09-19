import { useSessionStore } from '../session/sessionStore'
import { useAuthStore } from './authStore'

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
 * There is deliberately no periodic heartbeat. The backend README is explicit that
 * "ordinary background polling must not automatically extend a visitor's session", so a
 * guest's idle window is allowed to lapse on the server exactly as designed. A signed-in
 * customer's short access token is renewed instead by the timer `authStore` schedules
 * against its own expiry, which is the renewal the README does sanction, and a session
 * that has already lapsed is replaced automatically when the next call reports it.
 *
 * Imported for its side effect by `features/auth/routes.tsx`, so it is installed before
 * any auth screen can render.
 */

let installed = false

export function installKioskSessionBridge(): void {
  if (installed) {
    return
  }
  installed = true

  const current = useSessionStore.getState().session
  if (current) {
    void useAuthStore.getState().startServerSession(current.lang)
  }

  useSessionStore.subscribe((state, previous) => {
    const before = previous.session
    const after = state.session

    if (before && !after) {
      // Expiry or Start over. Identity and every challenge go with it (FR-4, FR-35).
      void useAuthStore.getState().endServerSession()
      return
    }

    if (after && (!before || before.sessionId !== after.sessionId)) {
      // A fresh session means a fresh person at the terminal.
      useAuthStore.getState().hardReset()
      void useAuthStore.getState().startServerSession(after.lang)
    }
  })

  // A reload must not leave a usable token behind in a restored page.
  window.addEventListener('beforeunload', () => {
    useAuthStore.getState().hardReset()
  })
}
