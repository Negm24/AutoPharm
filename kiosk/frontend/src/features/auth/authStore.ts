import { create } from 'zustand'
import {
  ApiError,
  clearCredentials,
  setAccessToken,
  setKioskSessionId,
  toApiError,
} from '../../shared/api'
import {
  ACCESS_RENEW_MARGIN_MS,
  LOCKOUT_THRESHOLD,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  lockoutSecondsFor,
} from './constants'
import { gateway } from './gateway'
import type { AuthSuccess, ChallengeKind, Customer, SignupDraft } from './types'
import { maskPhone, normalizeEgyptianPhone } from './validation'

export type AuthMode = 'guest' | 'authenticated'
export type AuthStatus = 'idle' | 'submitting'

/** Why the customer was asked to sign in. FR-29: only ever one of these. */
export type AuthReason = 'prescription' | 'insurance' | 'orders' | 'manual'

export interface PhoneDraft {
  e164: string
  national: string
  masked: string
}

export interface PendingChallenge {
  kind: ChallengeKind
  phone: PhoneDraft
  expiresAt: number
  resendAvailableAt: number
  attemptsUsed: number
  maxAttempts: number
  /** Dead means the challenge was burned; only a resend can revive the flow. */
  dead: boolean
}

interface AuthState {
  mode: AuthMode
  customer: Customer | null
  accessExpiresAt: number | null

  serverSessionId: string | null
  sessionDeadline: number | null

  phone: PhoneDraft | null
  signupDraft: SignupDraft | null
  /** Held only between the code screen and the new-PIN screen (one backend call). */
  resetCode: string | null

  challenge: PendingChallenge | null
  pinFailures: number
  lockedUntil: number | null
  serviceDown: boolean

  status: AuthStatus
  error: ApiError | null

  returnTo: string
  reason: AuthReason | null

  beginAuth: (input: { reason: AuthReason; returnTo: string }) => void
  setPhone: (raw: string) => boolean
  clearPhone: () => void
  setSignupDraft: (draft: SignupDraft) => void
  clearError: () => void

  submitPin: (pin: string) => Promise<boolean>
  requestSignup: (pin: string) => Promise<boolean>
  verifySignup: (code: string, emailCode?: string) => Promise<boolean>
  requestPinReset: () => Promise<boolean>
  setResetCode: (code: string) => void
  confirmPinReset: (newPin: string) => Promise<boolean>
  resendCode: (pin?: string) => Promise<boolean>
  redeemHandoff: (token: string) => Promise<boolean>

  continueAsGuest: () => void
  signOut: () => Promise<void>
  hardReset: () => void

  startServerSession: (locale: 'en' | 'ar') => Promise<void>
  extendServerSession: () => Promise<void>
  endServerSession: () => Promise<void>
}

const initial = {
  mode: 'guest' as AuthMode,
  customer: null,
  accessExpiresAt: null,
  phone: null,
  signupDraft: null,
  resetCode: null,
  challenge: null,
  pinFailures: 0,
  lockedUntil: null,
  serviceDown: false,
  status: 'idle' as AuthStatus,
  error: null,
  returnTo: '/kiosk/menu',
  reason: null,
}

/**
 * Feature 4 auth state.
 *
 * Nothing here is persisted and the access token is not here at all: it lives in
 * `shared/api/tokenStore`, a module closure, so a devtools state dump cannot reveal it
 * (SEC-9, SEC-10). The PIN is never stored anywhere — every action that needs one takes
 * it as an argument, uses it once, and lets it fall out of scope (SEC-3).
 *
 * "Guest" is the initial value, not a state you call something to enter: a kiosk session
 * simply has no user attached to it, which is what PRV-6 asks for.
 */
export const useAuthStore = create<AuthState>((set, get) => {
  let renewTimer: ReturnType<typeof setTimeout> | null = null

  const clearRenewTimer = () => {
    if (renewTimer !== null) {
      clearTimeout(renewTimer)
      renewTimer = null
    }
  }

  const scheduleRenew = (expiresAt: number) => {
    clearRenewTimer()
    // AUTH_ACCESS_TTL is 180s, so a customer reading a screen will outlive one token.
    const fireIn = Math.max(1000, expiresAt - ACCESS_RENEW_MARGIN_MS - Date.now())
    renewTimer = setTimeout(() => {
      void get().extendServerSession()
    }, fireIn)
  }

  const applySuccess = async (success: AuthSuccess) => {
    setAccessToken(success.accessToken, success.expiresIn)
    const expiresAt = Date.now() + success.expiresIn * 1000
    set({
      mode: 'authenticated',
      accessExpiresAt: expiresAt,
      pinFailures: 0,
      lockedUntil: null,
      challenge: null,
      resetCode: null,
      signupDraft: null,
      error: null,
      status: 'idle',
    })
    scheduleRenew(expiresAt)

    try {
      set({ customer: await gateway().me() })
    } catch {
      // The session is valid even if the profile fetch failed; the screens degrade to
      // showing the masked number instead of a name.
    }
  }

  const handleFailure = (raw: unknown): ApiError => {
    const error = toApiError(raw)

    if (error.isLockedOut) {
      const seconds =
        error.retryAfterSeconds ??
        lockoutSecondsFor(Math.max(get().pinFailures, LOCKOUT_THRESHOLD))
      set({ lockedUntil: Date.now() + seconds * 1000 })
    }
    if (error.isServiceDown) {
      set({ serviceDown: true })
    }
    if (error.needsNewSession) {
      // The kiosk session is gone server-side, so identity goes with it. FR-5 forbids
      // resuming one, so a brand new session is the correct recovery: without this the
      // app keeps sending no X-Kiosk-Session and every later call 401s until Start Over.
      clearCredentials()
      clearRenewTimer()
      set({ mode: 'guest', customer: null, accessExpiresAt: null, serverSessionId: null })
      const locale = document.documentElement.lang === 'ar' ? 'ar' : 'en'
      void get().startServerSession(locale)
    }

    set({ error, status: 'idle' })
    return error
  }

  const newChallenge = (kind: ChallengeKind, phone: PhoneDraft): PendingChallenge => ({
    kind,
    phone,
    expiresAt: Date.now() + OTP_TTL_MS,
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    attemptsUsed: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    dead: false,
  })

  const requirePhone = (): PhoneDraft | null => get().phone

  return {
    ...initial,
    serverSessionId: null,
    sessionDeadline: null,

    beginAuth: ({ reason, returnTo }) => {
      set({ reason, returnTo, error: null, status: 'idle' })
    },

    setPhone: (raw) => {
      const result = normalizeEgyptianPhone(raw)
      if (!result.ok) {
        return false
      }
      set({
        phone: {
          e164: result.e164,
          national: result.national,
          masked: maskPhone(result.e164),
        },
        error: null,
      })
      return true
    },

    clearPhone: () => set({ phone: null, challenge: null, resetCode: null, error: null }),

    setSignupDraft: (draft) => set({ signupDraft: draft }),

    clearError: () => set({ error: null }),

    submitPin: async (pin) => {
      const phone = requirePhone()
      if (!phone) {
        return false
      }
      set({ status: 'submitting', error: null })
      try {
        await applySuccess(
          await gateway().login({
            phoneNumber: phone.e164,
            phoneCountryCode: 'EG',
            pin,
          }),
        )
        return true
      } catch (raw) {
        const error = handleFailure(raw)
        if (error.code === 'invalid_credentials') {
          set({ pinFailures: get().pinFailures + 1 })
        }
        return false
      }
    },

    requestSignup: async (pin) => {
      const draft = get().signupDraft
      if (!draft) {
        return false
      }
      set({ status: 'submitting', error: null })
      try {
        await gateway().requestSignup({ ...draft, pin })
        set({
          challenge: newChallenge('signup', {
            e164: draft.phoneNumber,
            national: normalizeEgyptianPhone(draft.phoneNumber).national,
            masked: maskPhone(draft.phoneNumber),
          }),
          status: 'idle',
        })
        return true
      } catch (raw) {
        handleFailure(raw)
        return false
      }
    },

    verifySignup: async (code, emailCode) => {
      const challenge = get().challenge
      if (!challenge || challenge.dead) {
        return false
      }
      set({ status: 'submitting', error: null })
      try {
        await applySuccess(
          await gateway().verifySignup({
            phoneNumber: challenge.phone.e164,
            phoneCountryCode: 'EG',
            code,
            emailCode,
          }),
        )
        return true
      } catch (raw) {
        handleFailure(raw)
        const attemptsUsed = challenge.attemptsUsed + 1
        // The server consumes the SMS code before it checks the email one, so a failure
        // that reached the email step has already spent both. Nothing can be retyped;
        // only a fresh pair of codes can move the flow on.
        const spentBothCodes = emailCode !== undefined
        set({
          challenge: {
            ...challenge,
            attemptsUsed,
            dead: spentBothCodes || attemptsUsed >= challenge.maxAttempts,
          },
        })
        return false
      }
    },

    requestPinReset: async () => {
      const phone = requirePhone()
      if (!phone) {
        return false
      }
      set({ status: 'submitting', error: null })
      try {
        await gateway().requestPinReset({ phoneNumber: phone.e164, phoneCountryCode: 'EG' })
        set({ challenge: newChallenge('reset', phone), resetCode: null, status: 'idle' })
        return true
      } catch (raw) {
        handleFailure(raw)
        return false
      }
    },

    setResetCode: (code) => set({ resetCode: code, error: null }),

    confirmPinReset: async (newPin) => {
      const challenge = get().challenge
      const code = get().resetCode
      if (!challenge || !code) {
        return false
      }
      set({ status: 'submitting', error: null })
      try {
        // The backend verifies the code and sets the new PIN in one call, so a wrong code
        // only surfaces here. The screen sends the customer back to the code step.
        await applySuccess(
          await gateway().confirmPinReset({
            phoneNumber: challenge.phone.e164,
            phoneCountryCode: 'EG',
            code,
            newPin,
          }),
        )
        return true
      } catch (raw) {
        const error = handleFailure(raw)
        if (error.code === 'invalid_code') {
          const attemptsUsed = challenge.attemptsUsed + 1
          set({
            resetCode: null,
            challenge: {
              ...challenge,
              attemptsUsed,
              dead: attemptsUsed >= challenge.maxAttempts,
            },
          })
        }
        return false
      }
    },

    resendCode: async (pin) => {
      const challenge = get().challenge
      if (!challenge || Date.now() < challenge.resendAvailableAt) {
        return false
      }
      if (challenge.kind === 'reset') {
        return get().requestPinReset()
      }
      if (pin === undefined) {
        return false
      }
      return get().requestSignup(pin)
    },

    redeemHandoff: async (token) => {
      set({ status: 'submitting', error: null })
      try {
        await applySuccess(await gateway().redeemHandoff(token))
        return true
      } catch (raw) {
        handleFailure(raw)
        return false
      }
    },

    continueAsGuest: () => {
      // Deliberately no network call: a guest is simply a session with no user attached.
      set({
        phone: null,
        signupDraft: null,
        challenge: null,
        resetCode: null,
        error: null,
        status: 'idle',
      })
    },

    signOut: async () => {
      // FR-35: available manually at any time.
      clearRenewTimer()
      try {
        await gateway().endSession()
      } catch {
        // Signing out locally must succeed even if the backend cannot be reached.
      }
      clearCredentials()
      set({ ...initial, serverSessionId: null, sessionDeadline: null })
      const locale = document.documentElement.lang === 'ar' ? 'ar' : 'en'
      await get().startServerSession(locale)
    },

    hardReset: () => {
      clearRenewTimer()
      clearCredentials()
      set({ ...initial, serverSessionId: null, sessionDeadline: null })
    },

    startServerSession: async (locale) => {
      try {
        const session = await gateway().startSession(locale)
        setKioskSessionId(session.id)
        set({
          serverSessionId: session.id,
          sessionDeadline: session.deadline * 1000,
          serviceDown: false,
        })
      } catch (raw) {
        const error = toApiError(raw)
        // A kiosk that cannot start a session still sells over-the-counter items
        // (NFR-8); only sign-in is unavailable.
        set({ serverSessionId: null, serviceDown: error.isServiceDown || error.isOffline })
      }
    },

    extendServerSession: async () => {
      if (!get().serverSessionId) {
        return
      }
      try {
        const result = await gateway().extendSession()
        if (result.access) {
          setAccessToken(result.access.accessToken, result.access.expiresIn)
          const expiresAt = Date.now() + result.access.expiresIn * 1000
          set({ accessExpiresAt: expiresAt })
          scheduleRenew(expiresAt)
        }
      } catch (raw) {
        handleFailure(raw)
      }
    },

    endServerSession: async () => {
      clearRenewTimer()
      try {
        await gateway().endSession()
      } catch {
        // The session expires on its own server-side; nothing to recover here.
      }
      clearCredentials()
      set({ ...initial, serverSessionId: null, sessionDeadline: null })
    },
  }
})
