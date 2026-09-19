import type {
  AuthSuccess,
  Customer,
  KioskServerSession,
  SessionExtended,
  SignupDraft,
} from '../types'

export interface LoginInput {
  phoneNumber: string
  phoneCountryCode: string
  pin: string
}

export interface SignupInput extends SignupDraft {
  pin: string
}

export interface PhoneInput {
  phoneNumber: string
  phoneCountryCode: string
}

export interface VerifyInput extends PhoneInput {
  code: string
}

export interface ResetConfirmInput extends VerifyInput {
  newPin: string
}

/**
 * The seam between the auth screens and the backend.
 *
 * `httpGateway` speaks to `/api/v1/auth/kiosk/*`; `mockGateway` reproduces the same rules
 * in memory so the whole flow is demonstrable without Postgres, Redis and a provisioned
 * terminal. Screens and the store only ever see this interface.
 *
 * There is deliberately no `continueAsGuest()`. A guest is a kiosk session with no user
 * attached, so continuing as a guest is the absence of a call, not a call (PRV-6).
 */
export interface AuthGateway {
  startSession(locale: 'en' | 'ar'): Promise<KioskServerSession>
  extendSession(): Promise<SessionExtended>
  endSession(): Promise<void>

  login(input: LoginInput): Promise<AuthSuccess>

  requestSignup(input: SignupInput): Promise<void>
  verifySignup(input: VerifyInput): Promise<AuthSuccess>

  requestPinReset(input: PhoneInput): Promise<void>
  confirmPinReset(input: ResetConfirmInput): Promise<AuthSuccess>

  /** FR-33: the companion app mints a handoff token; the kiosk redeems it. */
  redeemHandoff(token: string): Promise<AuthSuccess>

  me(): Promise<Customer>
}
