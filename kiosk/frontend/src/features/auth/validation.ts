import { toAsciiDigits } from '../../shared/format/digits'
import { DEFAULT_DIAL_CODE, OTP_LENGTH, PIN_LENGTH } from './constants'

/**
 * A client-side mirror of `backend/apps/accounts/security/policy.py`.
 *
 * SEC-4 says the terminal is untrusted, so nothing here decides anything: a pass only
 * enables a button and gives instant feedback, and the server's answer always wins. The
 * mock gateway calls these same functions, so the mock and the UI cannot drift apart.
 */

// policy.validate_credential: sequences and blocklist, copied exactly.
const PIN_SEQUENCES = ['01234567890123456789', '98765432109876543210'] as const
const PIN_BLOCKLIST = new Set([
  '1212', '1122', '1004', '2000', '6969', '2580', '0852', '1010', '1313',
])

export type PinIssue = 'length' | 'repeated' | 'sequence' | 'blocked'

/** Returns null when the PIN is worth sending, otherwise why it is not. */
export function validatePin(value: string): PinIssue | null {
  // ASCII only: the backend regex is `[0-9]{4}` and rejects Arabic-Indic digits.
  if (!new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(value)) {
    return 'length'
  }
  if (new Set(value).size === 1) {
    return 'repeated'
  }
  if (PIN_SEQUENCES.some((sequence) => sequence.includes(value))) {
    return 'sequence'
  }
  if (PIN_BLOCKLIST.has(value)) {
    return 'blocked'
  }
  return null
}

export function isCompleteOtp(value: string): boolean {
  return new RegExp(`^[0-9]{${OTP_LENGTH}}$`).test(value)
}

// FR-30a: 11-digit national format on the 010 / 011 / 012 / 015 mobile prefixes.
const EG_NATIONAL = /^01[0125][0-9]{8}$/

export type PhoneIssue = 'empty' | 'length' | 'prefix'

export interface PhoneResult {
  ok: boolean
  issue: PhoneIssue | null
  /** Canonical E.164, which is the only form the backend stores. */
  e164: string
  national: string
}

/**
 * Accepts whatever the customer types — `01012345678`, `1012345678`, `+201012345678`,
 * spaces and Arabic-Indic digits included — and returns the canonical form.
 * FR-30a: "stored in a single canonical form (E.164) regardless of how the user types them".
 */
export function normalizeEgyptianPhone(raw: string): PhoneResult {
  let digits = toAsciiDigits(raw).replace(/[^0-9]/g, '')

  if (digits.startsWith('0020')) {
    digits = digits.slice(4)
  } else if (digits.startsWith('20') && digits.length > 10) {
    digits = digits.slice(2)
  }
  if (!digits.startsWith('0')) {
    digits = `0${digits}`
  }

  if (digits === '0') {
    return { ok: false, issue: 'empty', e164: '', national: '' }
  }
  if (digits.length !== 11) {
    return { ok: false, issue: 'length', e164: '', national: digits }
  }
  if (!EG_NATIONAL.test(digits)) {
    return { ok: false, issue: 'prefix', e164: '', national: digits }
  }

  return {
    ok: true,
    issue: null,
    e164: `${DEFAULT_DIAL_CODE}${digits.slice(1)}`,
    national: digits,
  }
}

/** `01012345678` -> `010 1234 5678`, the grouping Egyptian numbers are read in. */
export function formatNationalPhone(national: string): string {
  const digits = toAsciiDigits(national).replace(/[^0-9]/g, '')
  const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)]
  return groups.filter(Boolean).join(' ')
}

/**
 * SEC-5 / PRV-6: once a number has been submitted the screen shows only enough of it to
 * confirm the customer typed their own. `+201012345678` -> `+20 10• ••• 678`.
 */
export function maskPhone(value: string): string {
  const digits = toAsciiDigits(value).replace(/[^0-9]/g, '')
  if (digits.length < 4) {
    return '•••'
  }
  const tail = digits.slice(-3)
  const lead = digits.startsWith('20') ? digits.slice(2, 4) : digits.slice(0, 2)
  return `${DEFAULT_DIAL_CODE} ${lead}• ••• ${tail}`
}

/**
 * Mirrors `validate_latin_name`: Latin letters plus space, apostrophe, right single
 * quote and hyphen. The backend rejects Arabic script here even though the kiosk is
 * bilingual, because the pharmacy register is Latin-only — so the name field warns before
 * the customer has typed a whole form and lost it to a server error.
 */
const LATIN_NAME = /^[A-Za-zÀ-ɏ]+(?:[ '’-][A-Za-zÀ-ɏ]+)*$/

export type NameIssue = 'required' | 'latin'

export function validateName(value: string): NameIssue | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'required'
  }
  return LATIN_NAME.test(trimmed) ? null : 'latin'
}

export type DateIssue = 'required' | 'invalid' | 'future'

/** Takes DDMMYYYY as typed on the numeric pad and returns the ISO form the API wants. */
export function parseDateOfBirth(digits: string): { issue: DateIssue | null; iso: string } {
  if (!digits) {
    return { issue: 'required', iso: '' }
  }
  if (digits.length !== 8) {
    return { issue: 'invalid', iso: '' }
  }

  const day = Number(digits.slice(0, 2))
  const month = Number(digits.slice(2, 4))
  const year = Number(digits.slice(4, 8))
  const candidate = new Date(Date.UTC(year, month - 1, day))

  const valid =
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  if (!valid) {
    return { issue: 'invalid', iso: '' }
  }
  if (candidate.getTime() > Date.now()) {
    return { issue: 'future', iso: '' }
  }

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { issue: null, iso }
}

export function formatDateOfBirth(digits: string): string {
  const groups = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
  return groups.filter(Boolean).join(' / ')
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Optional field: empty is valid, anything present must look like an address. */
export function validateEmail(value: string): 'invalid' | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return EMAIL.test(trimmed) ? null : 'invalid'
}
