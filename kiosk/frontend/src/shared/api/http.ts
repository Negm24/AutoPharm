import { API_BASE_URL, API_TIMEOUT_MS, KIOSK_SESSION_HEADER } from './config'
import { ApiError, parseErrorBody, toApiError } from './ApiError'
import { getAccessToken, getKioskSessionId } from './tokenStore'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Attach the bearer token when one exists. Default true. */
  auth?: boolean
  /** Attach X-Kiosk-Session. Default true; only sessions/start/ opts out. */
  session?: boolean
  signal?: AbortSignal
  timeoutMs?: number
  /** Override the language sent in Accept-Language. */
  lang?: string
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  })

  if (options.lang) {
    headers.set('Accept-Language', options.lang)
  }

  if (options.session !== false) {
    const sessionId = getKioskSessionId()
    if (sessionId) {
      headers.set(KIOSK_SESSION_HEADER, sessionId)
    }
  }

  if (options.auth !== false) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // X-Terminal-Key is deliberately absent: the dev proxy and the nginx reverse proxy
  // inject it, so the terminal credential never exists in browser JavaScript.
  return headers
}

function combineSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }
  const text = await response.text()
  if (!text) {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    // A proxy error page, not the API. Never surface raw HTML to a customer.
    return undefined
  }
}

/**
 * The single fetch wrapper for the whole app.
 *
 * Request bodies are never logged: a PIN and a verification code travel through here
 * and SEC-5 forbids them appearing in logs, analytics or crash reports.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'POST', body } = options
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(options),
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: combineSignals(options.signal, options.timeoutMs ?? API_TIMEOUT_MS),
    })
  } catch (error) {
    throw toApiError(error)
  }

  const payload = await readBody(response)

  if (!response.ok) {
    const header = response.headers.get('Retry-After')
    const retryAfter = header !== null && header !== '' ? Number(header) : null
    throw parseErrorBody(
      payload,
      response.status,
      retryAfter !== null && Number.isFinite(retryAfter) ? retryAfter : null,
    )
  }

  return payload as T
}

export { ApiError }
