import { request } from '../../../shared/api'
import type { AuthSuccess, Customer, SessionExtended } from '../types'
import type {
  AuthGateway,
  LoginInput,
  PhoneInput,
  ResetConfirmInput,
  SignupInput,
  VerifyInput,
} from './AuthGateway'

/**
 * Written against `backend/apps/accounts/api/urls.py` and `services/kiosk.py`.
 *
 * The backend also requires an `X-Terminal-Key` header on every one of these routes. It
 * is injected by the Vite dev proxy and by nginx in production, because `Terminal`'s own
 * docstring forbids provisioning that secret into browser JavaScript.
 */

const BASE = '/auth/kiosk'

interface AccessPayload {
  access_token: string
  expires_in: number
  user_id: string
}

interface SessionPayload {
  id: string
  terminal_id: string
  user_id: string | null
  locale: 'en' | 'ar'
  deadline: number
  expires_in: number
}

interface ExtendPayload extends Partial<AccessPayload> {
  expires_in: number
}

interface UserPayload {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  phone_country_code: string
  date_of_birth: string
  email: string | null
}

function toAuthSuccess(payload: AccessPayload): AuthSuccess {
  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
    userId: payload.user_id,
  }
}

function toCustomer(payload: UserPayload): Customer {
  return {
    id: payload.id,
    firstName: payload.first_name,
    lastName: payload.last_name,
    phoneNumber: payload.phone_number,
    phoneCountryCode: payload.phone_country_code,
    dateOfBirth: payload.date_of_birth,
    email: payload.email,
  }
}

function phoneBody(input: PhoneInput) {
  return {
    phone_number: input.phoneNumber,
    phone_country_code: input.phoneCountryCode,
  }
}

export function createHttpGateway(): AuthGateway {
  return {
    async startSession(locale) {
      // The only kiosk route that does not carry X-Kiosk-Session: it mints one.
      const payload = await request<SessionPayload>(`${BASE}/sessions/start/`, {
        body: { locale },
        session: false,
        auth: false,
      })
      return {
        id: payload.id,
        terminalId: payload.terminal_id,
        userId: payload.user_id,
        locale: payload.locale,
        deadline: payload.deadline,
        expiresIn: payload.expires_in,
      }
    },

    async extendSession(): Promise<SessionExtended> {
      const payload = await request<ExtendPayload>(`${BASE}/sessions/extend/`)
      // The kiosk has no refresh token: extending the session is also how the short
      // access token (AUTH_ACCESS_TTL = 180s) is renewed while signed in.
      const access = payload.access_token
        ? toAuthSuccess(payload as AccessPayload)
        : null
      return { expiresIn: payload.expires_in, access }
    },

    async endSession() {
      await request(`${BASE}/sessions/end/`)
    },

    async login(input: LoginInput) {
      return toAuthSuccess(
        await request<AccessPayload>(`${BASE}/login/`, {
          body: { ...phoneBody(input), pin: input.pin },
          auth: false,
        }),
      )
    },

    async requestSignup(input: SignupInput) {
      await request(`${BASE}/signup/request/`, {
        body: {
          ...phoneBody(input),
          first_name: input.firstName,
          last_name: input.lastName,
          date_of_birth: input.dateOfBirth,
          email: input.email || null,
          pin: input.pin,
        },
        auth: false,
      })
    },

    async verifySignup(input: VerifyInput) {
      return toAuthSuccess(
        await request<AccessPayload>(`${BASE}/signup/verify/`, {
          body: { ...phoneBody(input), code: input.code },
          auth: false,
        }),
      )
    },

    async requestPinReset(input: PhoneInput) {
      await request(`${BASE}/pin-reset/request/`, { body: phoneBody(input), auth: false })
    },

    async confirmPinReset(input: ResetConfirmInput) {
      return toAuthSuccess(
        await request<AccessPayload>(`${BASE}/pin-reset/confirm/`, {
          body: { ...phoneBody(input), code: input.code, new_pin: input.newPin },
          auth: false,
        }),
      )
    },

    async redeemHandoff(token: string) {
      return toAuthSuccess(
        await request<AccessPayload>(`${BASE}/handoff/redeem/`, {
          body: { token },
          auth: false,
        }),
      )
    },

    async me() {
      return toCustomer(await request<UserPayload>(`${BASE}/me/`, { method: 'GET' }))
    },
  }
}
