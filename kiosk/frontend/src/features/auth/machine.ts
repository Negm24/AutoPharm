import type { PendingChallenge } from './authStore'

export type AuthStep =
  | 'unavailable'
  | 'locked'
  | 'done'
  | 'reset_pin'
  | 'reset_verify'
  | 'signup_verify'
  | 'pin'
  | 'phone'

/** Only the fields that decide which screen the customer belongs on. */
export interface AuthSnapshot {
  mode: 'guest' | 'authenticated'
  serviceDown: boolean
  lockedUntil: number | null
  challenge: Pick<PendingChallenge, 'kind'> | null
  resetCode: string | null
  phone: unknown | null
}

export const AUTH_PATHS: Record<AuthStep, string> = {
  unavailable: '/kiosk/auth/unavailable',
  locked: '/kiosk/auth/locked',
  done: '/kiosk/account',
  reset_pin: '/kiosk/auth/reset/pin',
  reset_verify: '/kiosk/auth/reset/verify',
  signup_verify: '/kiosk/auth/signup/verify',
  pin: '/kiosk/auth/pin',
  phone: '/kiosk/auth/phone',
}

/**
 * The single source of truth for "which auth screen is this customer actually on".
 *
 * Route guards compare the screen they are protecting against this, so a refresh, a
 * back button or a hand-typed URL can never leave the address bar disagreeing with the
 * store. Precedence matters: a locked account outranks a half-finished flow, and a
 * backend that is down outranks everything, because neither can be progressed past.
 */
export function deriveStep(state: AuthSnapshot, now = Date.now()): AuthStep {
  if (state.serviceDown) {
    return 'unavailable'
  }
  if (state.lockedUntil !== null && state.lockedUntil > now) {
    return 'locked'
  }
  if (state.mode === 'authenticated') {
    return 'done'
  }
  if (state.challenge?.kind === 'reset') {
    return state.resetCode ? 'reset_pin' : 'reset_verify'
  }
  if (state.challenge?.kind === 'signup') {
    return 'signup_verify'
  }
  if (state.phone) {
    return 'pin'
  }
  return 'phone'
}

export function pathForStep(step: AuthStep): string {
  return AUTH_PATHS[step]
}
