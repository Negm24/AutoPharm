/**
 * Credentials live in this module closure, deliberately not in a Zustand store.
 *
 * The kiosk is a shared wall terminal (SEC-3, SEC-9, SEC-10): nothing here may reach
 * localStorage, sessionStorage, a cookie, or a devtools state dump, and a future
 * `persist` middleware on a store must not be able to pick it up by accident. Screens
 * read `accessExpiresAt` from the auth store instead; the token itself never leaves here.
 */

let accessToken: string | null = null
let accessExpiresAt = 0
let kioskSessionId: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string, expiresInSeconds: number): void {
  accessToken = token
  accessExpiresAt = Date.now() + expiresInSeconds * 1000
}

export function clearAccessToken(): void {
  accessToken = null
  accessExpiresAt = 0
}

export function getAccessExpiresAt(): number {
  return accessExpiresAt
}

export function isAccessNearExpiry(marginMs = 30_000): boolean {
  return accessToken !== null && accessExpiresAt - marginMs <= Date.now()
}

export function getKioskSessionId(): string | null {
  return kioskSessionId
}

export function setKioskSessionId(sessionId: string | null): void {
  kioskSessionId = sessionId
}

/** Wipes every credential. Called on session end, sign-out, start-over and unload. */
export function clearCredentials(): void {
  clearAccessToken()
  kioskSessionId = null
}
