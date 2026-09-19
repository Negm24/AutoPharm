/**
 * Every value here mirrors a backend setting or a rule in
 * `backend/apps/accounts/{security,services}`. The backend is authoritative; these exist
 * so the UI can show a countdown or disable a button without a round trip.
 */

/** FR-30 / FR-32b: the PIN is typed often, the code is typed once. */
export const PIN_LENGTH = 4
export const OTP_LENGTH = 6

/** kiosk.request_code: ttl = min(300, AUTH_KIOSK_IDLE_TTL=180, session remaining). */
export const OTP_TTL_MS = 180_000

/** kiosk.request_code: rate_limit('sms:' + phone, 1, 30). */
export const RESEND_COOLDOWN_MS = 30_000

/** security/state.py verify_code: the 5th wrong attempt deletes the challenge. */
export const OTP_MAX_ATTEMPTS = 5

/** security/state.py failure(): the ladder starts on the 5th failure. */
export const LOCKOUT_THRESHOLD = 5
const LOCKOUT_BASE_SECONDS = 30
const LOCKOUT_MAX_SECONDS = 900

/**
 * Mirrors the Lua in `security/state.py`:
 *   if count >= 5 then seconds = min(30 * 2 ^ min(count - 5, 5), 900)
 * Presentational only — the server's 429 is what actually locks the account.
 */
export function lockoutSecondsFor(failureCount: number): number {
  if (failureCount < LOCKOUT_THRESHOLD) {
    return 0
  }
  const exponent = Math.min(failureCount - LOCKOUT_THRESHOLD, 5)
  return Math.min(LOCKOUT_BASE_SECONDS * 2 ** exponent, LOCKOUT_MAX_SECONDS)
}

/** Renew the access token this far ahead of AUTH_ACCESS_TTL (180s). */
export const ACCESS_RENEW_MARGIN_MS = 30_000

/** sessions/extend/ doubles as the idle-timer extension and the token renewal. */
export const SESSION_HEARTBEAT_MS = 60_000

/** PRV-7 and the mockup: personal data clears on its own short timer. */
export const PRIVACY_AUTO_CLEAR_MS = 90_000

/**
 * Phone entry accepts every form normalizeEgyptianPhone understands, so the field must be
 * wide enough to hold the longest of them (0020 + 10 digits). Capping at the 11-digit
 * national length truncated a country-code prefix into nonsense before the validator ever
 * saw it.
 */
export const MAX_TYPED_PHONE_DIGITS = 14

/** Below this there is nothing useful to say yet, so errors stay quiet while typing. */
export const MIN_JUDGEABLE_PHONE_DIGITS = 10

/** FR-30a. The kiosk is deployed in Egypt; the backend requires a mobile number. */
export const DEFAULT_COUNTRY = 'EG'
export const DEFAULT_DIAL_CODE = '+20'

export const QR_ENABLED = import.meta.env.VITE_AUTH_QR_ENABLED === 'true'
