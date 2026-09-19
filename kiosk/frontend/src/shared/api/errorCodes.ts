/**
 * Codes the backend emits (apps/accounts/security/errors.py and api/exceptions.py) plus
 * the three the client synthesises when no response was received at all.
 */
export const API_ERROR_CODES = [
  'invalid_terminal',
  'invalid_locale',
  'session_expired',
  'invalid_token',
  'invalid_credentials',
  'invalid_code',
  'invalid_purpose',
  'invalid_handoff',
  'unable_to_register',
  'rate_limited',
  'security_unavailable',
  'sms_unavailable',
  'invalid_input',
  'not_found',
  'network_error',
  'timeout',
  'unknown',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

const KNOWN = new Set<string>(API_ERROR_CODES)

export function asApiErrorCode(value: unknown): ApiErrorCode {
  return typeof value === 'string' && KNOWN.has(value) ? (value as ApiErrorCode) : 'unknown'
}
