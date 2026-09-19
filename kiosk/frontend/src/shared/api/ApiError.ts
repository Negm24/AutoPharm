import { asApiErrorCode, type ApiErrorCode } from './errorCodes'

interface ApiErrorInit {
  code: ApiErrorCode
  status: number
  detail: string
  fields?: Record<string, string> | null
  retryAfterSeconds?: number | null
}

/**
 * One error type for every failure shape the backend can produce, so screens switch on
 * `code` instead of parsing bodies. `detail` is written by the backend to be shown to a
 * customer; screens render it directly and fall back to a translated string only when it
 * is empty.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly detail: string
  readonly fields: Record<string, string> | null
  readonly retryAfterSeconds: number | null

  constructor(init: ApiErrorInit) {
    super(init.detail)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.detail = init.detail
    this.fields = init.fields ?? null
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }

  /** No response arrived, so retrying the same request is reasonable. */
  get isOffline(): boolean {
    return this.code === 'network_error' || this.code === 'timeout'
  }

  /** Server-side lockout or throttling. The server is always the authority here. */
  get isLockedOut(): boolean {
    return this.code === 'rate_limited'
  }

  /** Redis or the SMS gateway is down: sign-in cannot work, guest still can. */
  get isServiceDown(): boolean {
    return this.code === 'security_unavailable' || this.code === 'sms_unavailable'
  }

  /** The kiosk session is gone; a new one must be started before anything else. */
  get needsNewSession(): boolean {
    return this.code === 'session_expired' || this.code === 'invalid_terminal'
  }
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstString(entry)
      if (found) {
        return found
      }
    }
  }
  return null
}

/**
 * Normalises the four shapes the backend can return:
 *   {code, detail}                         AuthError
 *   {code: 'invalid_input', errors: [...]}  Django ValidationError
 *   {field: ['message'], ...}               DRF serializer errors
 *   {detail: '...'}                         DRF default handler
 */
export function parseErrorBody(body: unknown, status: number, retryAfter: number | null): ApiError {
  if (!body || typeof body !== 'object') {
    return new ApiError({ code: 'unknown', status, detail: '', retryAfterSeconds: retryAfter })
  }

  const record = body as Record<string, unknown>
  const code = asApiErrorCode(record.code)

  if (Array.isArray(record.errors)) {
    return new ApiError({
      code: code === 'unknown' ? 'invalid_input' : code,
      status,
      detail: firstString(record.errors) ?? '',
      retryAfterSeconds: retryAfter,
    })
  }

  if (typeof record.code === 'string') {
    return new ApiError({
      code,
      status,
      detail: typeof record.detail === 'string' ? record.detail : '',
      retryAfterSeconds: retryAfter,
    })
  }

  // DRF serializer errors: every key is a field name mapping to a list of messages.
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === 'detail') {
      continue
    }
    const message = firstString(value)
    if (message) {
      fields[key] = message
    }
  }

  const fieldCount = Object.keys(fields).length
  return new ApiError({
    code: fieldCount > 0 ? 'invalid_input' : 'unknown',
    status,
    detail: typeof record.detail === 'string' ? record.detail : (firstString(Object.values(fields)) ?? ''),
    fields: fieldCount > 0 ? fields : null,
    retryAfterSeconds: retryAfter,
  })
}

/** Total function: anything thrown anywhere becomes a displayable ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ code: 'timeout', status: 0, detail: '' })
  }
  return new ApiError({ code: 'network_error', status: 0, detail: '' })
}
