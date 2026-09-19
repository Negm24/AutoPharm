import { ApiError } from '../../../shared/api'
import type { ApiErrorCode } from '../../../shared/api'
import {
  LOCKOUT_THRESHOLD,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  lockoutSecondsFor,
} from '../constants'
import type { AuthSuccess, ChallengeKind, Customer, KioskServerSession } from '../types'
import { isCompleteOtp, validatePin } from '../validation'
import type {
  AuthGateway,
  LoginInput,
  PhoneInput,
  ResetConfirmInput,
  SignupInput,
  VerifyInput,
} from './AuthGateway'
import { mockOtpChannel } from './mockOtpChannel'

/**
 * An in-memory replica of `backend/apps/accounts/services/kiosk.py` and
 * `security/state.py`, faithful to every rule a customer can observe: the PIN policy, the
 * 6-digit code, its 5-attempt burn, the 30s resend cooldown and the 30s to 900s lockout
 * ladder. It shares `validation.ts` with the UI, so the two cannot disagree about what a
 * valid PIN is.
 *
 * This is the default gateway because the HTTP one additionally needs Postgres, Redis and
 * a provisioned Terminal row. `VITE_AUTH_GATEWAY=http` switches over.
 */

const SESSION_MAX_TTL_SECONDS = 900
const SESSION_IDLE_TTL_SECONDS = 180
const ACCESS_TTL_SECONDS = 180

/** Using this number simulates Redis being unreachable, so the 503 path is clickable. */
const SERVICE_DOWN_PHONE = '+201000000503'

interface MockAccount {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string | null
  phoneNumber: string
  phoneCountryCode: string
  pin: string
}

interface MockChallenge {
  kind: ChallengeKind
  code: string
  expiresAt: number
  attempts: number
  profile: SignupInput | null
}

interface MockSession extends KioskServerSession {
  deadlineMs: number
}

const accounts = new Map<string, MockAccount>()
const challenges = new Map<string, MockChallenge>()
const failures = new Map<string, number>()
const lockedUntil = new Map<string, number>()
const lastCodeSentAt = new Map<string, number>()

let session: MockSession | null = null
let signedInPhone: string | null = null
let nextUserId = 1

function seed(): void {
  if (accounts.size > 0) {
    return
  }
  accounts.set('+201012345678', {
    id: 'USR-0000000001',
    firstName: 'Yousef',
    lastName: 'Rashid',
    dateOfBirth: '1994-03-12',
    email: 'yousef@example.invalid',
    phoneNumber: '+201012345678',
    phoneCountryCode: 'EG',
    pin: '4729',
  })
  nextUserId = 2
}

function delay(): Promise<void> {
  // Enough latency that loading states are genuinely exercised (NFR-5), but not in the
  // test run, where it would only make the suite slow.
  if (import.meta.env.MODE === 'test') {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 200))
}

function fail(code: ApiErrorCode, detail: string, status: number): never {
  throw new ApiError({ code, status, detail })
}

function guardService(phone: string): void {
  if (phone === SERVICE_DOWN_PHONE) {
    fail('security_unavailable', 'Authentication is temporarily unavailable.', 503)
  }
}

function requireSession(): MockSession {
  if (!session || session.deadlineMs <= Date.now()) {
    session = null
    fail('session_expired', 'Start a new session.', 401)
  }
  return session
}

function checkLock(phone: string): void {
  if ((lockedUntil.get(phone) ?? 0) > Date.now()) {
    fail('rate_limited', 'Too many attempts. Try again later.', 429)
  }
}

function recordFailure(phone: string): void {
  const count = (failures.get(phone) ?? 0) + 1
  failures.set(phone, count)
  if (count >= LOCKOUT_THRESHOLD) {
    lockedUntil.set(phone, Date.now() + lockoutSecondsFor(count) * 1000)
  }
}

function clearFailures(phone: string): void {
  failures.delete(phone)
  lockedUntil.delete(phone)
}

function assertPinPolicy(pin: string): void {
  const issue = validatePin(pin)
  if (issue === 'length') {
    fail('invalid_input', 'Use exactly four digits for your PIN.', 400)
  }
  if (issue !== null) {
    fail('invalid_input', 'Choose a less predictable PIN.', 400)
  }
}

function issueCode(kind: ChallengeKind, phone: string, profile: SignupInput | null): void {
  // rate_limit sms:<phone> to 1 per 30 seconds.
  if (Date.now() - (lastCodeSentAt.get(phone) ?? 0) < RESEND_COOLDOWN_MS) {
    fail('rate_limited', 'Too many attempts. Try again later.', 429)
  }

  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  // A newer code supersedes the previous challenge for this phone, on any terminal.
  challenges.set(phone, {
    kind,
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    profile,
  })
  lastCodeSentAt.set(phone, Date.now())

  if (import.meta.env.DEV) {
    mockOtpChannel.publish(phone, code)
  }
}

function takeChallenge(kind: ChallengeKind, phone: string, code: string): MockChallenge {
  const challenge = challenges.get(phone)
  if (!challenge || challenge.kind !== kind || challenge.expiresAt <= Date.now()) {
    challenges.delete(phone)
    fail('invalid_code', 'The code is invalid or expired.', 400)
  }

  // A malformed entry still burns an attempt, exactly as the backend Lua does.
  if (!isCompleteOtp(code) || challenge.code !== code) {
    challenge.attempts += 1
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      challenges.delete(phone)
    }
    fail('invalid_code', 'The code is invalid or expired.', 400)
  }

  challenges.delete(phone)
  return challenge
}

function grant(account: MockAccount): AuthSuccess {
  const current = requireSession()
  signedInPhone = account.phoneNumber
  current.userId = account.id
  return {
    accessToken: `mock.${account.id}.${Date.now()}`,
    expiresIn: Math.min(
      ACCESS_TTL_SECONDS,
      SESSION_IDLE_TTL_SECONDS,
      Math.max(1, Math.floor((current.deadlineMs - Date.now()) / 1000)),
    ),
    userId: account.id,
  }
}

function toCustomer(account: MockAccount): Customer {
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    phoneNumber: account.phoneNumber,
    phoneCountryCode: account.phoneCountryCode,
    dateOfBirth: account.dateOfBirth,
    email: account.email,
  }
}

export function createMockGateway(): AuthGateway {
  seed()

  return {
    async startSession(locale) {
      await delay()
      // Starting a session destroys the terminal's previous one (FR-5).
      challenges.clear()
      signedInPhone = null
      const deadlineMs = Date.now() + SESSION_MAX_TTL_SECONDS * 1000
      session = {
        id: `mock-session-${Date.now()}`,
        terminalId: 'mock-terminal',
        userId: null,
        locale,
        deadline: Math.floor(deadlineMs / 1000),
        deadlineMs,
        expiresIn: SESSION_IDLE_TTL_SECONDS,
      }
      return { ...session }
    },

    async extendSession() {
      await delay()
      const current = requireSession()
      const remaining = Math.max(1, Math.floor((current.deadlineMs - Date.now()) / 1000))
      const account = signedInPhone ? accounts.get(signedInPhone) : undefined
      return {
        expiresIn: Math.min(SESSION_IDLE_TTL_SECONDS, remaining),
        access: account ? grant(account) : null,
      }
    },

    async endSession() {
      await delay()
      session = null
      signedInPhone = null
      challenges.clear()
    },

    async login(input: LoginInput) {
      await delay()
      requireSession()
      guardService(input.phoneNumber)
      checkLock(input.phoneNumber)

      const account = accounts.get(input.phoneNumber)
      if (!account || account.pin !== input.pin) {
        // An unknown number fails identically to a wrong PIN: no account enumeration.
        recordFailure(input.phoneNumber)
        checkLock(input.phoneNumber)
        fail('invalid_credentials', 'Authentication failed.', 401)
      }

      clearFailures(input.phoneNumber)
      return grant(account)
    },

    async requestSignup(input: SignupInput) {
      await delay()
      requireSession()
      guardService(input.phoneNumber)
      assertPinPolicy(input.pin)
      issueCode('signup', input.phoneNumber, input)
    },

    async verifySignup(input: VerifyInput) {
      await delay()
      requireSession()
      const challenge = takeChallenge('signup', input.phoneNumber, input.code)
      const profile = challenge.profile
      if (!profile) {
        fail('invalid_code', 'The code is invalid or expired.', 400)
      }
      if (accounts.has(input.phoneNumber)) {
        fail('unable_to_register', 'Unable to register; try signing in.', 400)
      }

      const account: MockAccount = {
        id: `USR-${String(nextUserId).padStart(10, '0')}`,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        email: profile.email || null,
        phoneNumber: profile.phoneNumber,
        phoneCountryCode: profile.phoneCountryCode,
        pin: profile.pin,
      }
      nextUserId += 1
      accounts.set(account.phoneNumber, account)
      clearFailures(account.phoneNumber)
      return grant(account)
    },

    async requestPinReset(input: PhoneInput) {
      await delay()
      requireSession()
      guardService(input.phoneNumber)
      // Issued whether or not the account exists, so the reply cannot be used to discover
      // who holds an account here.
      issueCode('reset', input.phoneNumber, null)
    },

    async confirmPinReset(input: ResetConfirmInput) {
      await delay()
      requireSession()
      assertPinPolicy(input.newPin)
      takeChallenge('reset', input.phoneNumber, input.code)

      const account = accounts.get(input.phoneNumber)
      if (!account) {
        fail('invalid_code', 'The code is invalid or expired.', 400)
      }
      account.pin = input.newPin
      clearFailures(account.phoneNumber)
      return grant(account)
    },

    async redeemHandoff(token: string) {
      await delay()
      requireSession()
      const account = [...accounts.values()].find((entry) => token.endsWith(entry.id))
      if (!account) {
        fail('invalid_handoff', 'Authentication failed.', 401)
      }
      return grant(account)
    },

    async me() {
      await delay()
      requireSession()
      const account = signedInPhone ? accounts.get(signedInPhone) : undefined
      if (!account) {
        fail('invalid_token', 'Authentication failed.', 401)
      }
      return toCustomer(account)
    },
  }
}

/** Test seam: wipes every mock record so each test starts from a known state. */
export function resetMockGateway(): void {
  accounts.clear()
  challenges.clear()
  failures.clear()
  lockedUntil.clear()
  lastCodeSentAt.clear()
  session = null
  signedInPhone = null
  nextUserId = 1
  seed()
}
