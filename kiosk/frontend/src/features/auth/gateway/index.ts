import type { AuthGateway } from './AuthGateway'
import { createHttpGateway } from './httpGateway'
import { createMockGateway } from './mockGateway'

let instance: AuthGateway | null = null

/**
 * `VITE_AUTH_GATEWAY=http` points the same screens at the real backend. The default is
 * the mock, because the HTTP path additionally needs Postgres, Redis and a provisioned
 * Terminal row before a single request can succeed.
 */
export function gateway(): AuthGateway {
  if (!instance) {
    instance =
      import.meta.env.VITE_AUTH_GATEWAY === 'http' ? createHttpGateway() : createMockGateway()
  }
  return instance
}

/** Test seam: inject a gateway, or pass null to fall back to the env-selected one. */
export function setGateway(next: AuthGateway | null): void {
  instance = next
}

export type { AuthGateway } from './AuthGateway'
