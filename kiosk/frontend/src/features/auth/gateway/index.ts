import type { AuthGateway } from './AuthGateway'
import { createHttpGateway } from './httpGateway'

let instance: AuthGateway | null = null

/**
 * The kiosk always talks to the real Django API at `/api/v1/auth/kiosk/*`.
 *
 * There is deliberately no runtime switch and no in-browser substitute: `mockGateway` is
 * imported only by its own Vitest file, so Vite never includes it in a dev or production
 * build and there is no code path that could reach it by accident.
 */
export function gateway(): AuthGateway {
  if (!instance) {
    instance = createHttpGateway()
  }
  return instance
}

/** Test seam: inject a gateway, or pass null to fall back to the real one. */
export function setGateway(next: AuthGateway | null): void {
  instance = next
}

export type { AuthGateway } from './AuthGateway'
