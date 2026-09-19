import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionStore } from '../../session/sessionStore'
import { useAuthStore } from '../authStore'
import { deriveStep, pathForStep, type AuthStep } from '../machine'

/** No kiosk session means nobody is standing here. Back to the attract screen. */
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSessionStore((state) => state.session)
  if (!session) {
    return <Navigate to="/kiosk/attract" replace />
  }
  return <>{children}</>
}

/**
 * Keeps the address bar and the store in agreement.
 *
 * Nothing about an auth flow is persisted — FR-5 says a session is never resumable by
 * the next person — so a refresh, a typed URL or a back button lands on a screen whose
 * prerequisites are gone. Rather than erroring, the guard asks the state machine where
 * this customer actually belongs and sends them there silently.
 */
export function RequireStep({ step, children }: { step: AuthStep; children: ReactNode }) {
  const mode = useAuthStore((state) => state.mode)
  const serviceDown = useAuthStore((state) => state.serviceDown)
  const lockedUntil = useAuthStore((state) => state.lockedUntil)
  const challenge = useAuthStore((state) => state.challenge)
  const resetCode = useAuthStore((state) => state.resetCode)
  const phone = useAuthStore((state) => state.phone)

  const actual = deriveStep({ mode, serviceDown, lockedUntil, challenge, resetCode, phone })

  if (actual !== step) {
    return <Navigate to={pathForStep(actual)} replace />
  }
  return <>{children}</>
}
