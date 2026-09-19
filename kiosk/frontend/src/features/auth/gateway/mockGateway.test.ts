import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api'
import { lockoutSecondsFor } from '../constants'
import { createMockGateway, resetMockGateway } from './mockGateway'
import { mockOtpChannel } from './mockOtpChannel'
import type { AuthGateway } from './AuthGateway'

const SEEDED_PHONE = '+201012345678'
const SEEDED_PIN = '4729'

async function expectApiError(action: Promise<unknown>, code: string): Promise<ApiError> {
  const error = await action.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(ApiError)
  expect((error as ApiError).code).toBe(code)
  return error as ApiError
}

/**
 * The mock is the only place these backend rules are reproduced, so a drift here is a
 * drift in what the whole feature demonstrates. Each case matches a rule in
 * `services/kiosk.py` or `security/state.py`.
 */
describe('mock gateway reproduces the backend rules', () => {
  let auth: AuthGateway

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    resetMockGateway()
    auth = createMockGateway()
    await auth.startSession('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('signs in with the seeded PIN and reports a bounded token life', async () => {
    const success = await auth.login({
      phoneNumber: SEEDED_PHONE,
      phoneCountryCode: 'EG',
      pin: SEEDED_PIN,
    })
    // min(AUTH_ACCESS_TTL, AUTH_KIOSK_IDLE_TTL, session remaining)
    expect(success.expiresIn).toBeLessThanOrEqual(180)
    expect(success.userId).toBe('USR-0000000001')
  })

  it('fails an unknown number exactly like a wrong PIN, so accounts cannot be enumerated', async () => {
    const unknown = await expectApiError(
      auth.login({ phoneNumber: '+201119999999', phoneCountryCode: 'EG', pin: '5826' }),
      'invalid_credentials',
    )
    const wrong = await expectApiError(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: '5826' }),
      'invalid_credentials',
    )
    expect(unknown.status).toBe(wrong.status)
    expect(unknown.detail).toBe(wrong.detail)
  })

  it('locks the account on the fifth wrong PIN', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expectApiError(
        auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: '5826' }),
        'invalid_credentials',
      )
    }
    const locked = await expectApiError(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: '5826' }),
      'rate_limited',
    )
    expect(locked.status).toBe(429)

    // Even the correct PIN is refused while the lock stands: the server decides, not the UI.
    await expectApiError(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: SEEDED_PIN }),
      'rate_limited',
    )
  })

  it('rejects a PIN that breaks the policy, with the backend wording', async () => {
    const error = await expectApiError(
      auth.requestSignup({
        firstName: 'Nadia',
        lastName: 'Hassan',
        dateOfBirth: '1992-02-02',
        email: '',
        phoneNumber: '+201111111111',
        phoneCountryCode: 'EG',
        pin: '1234',
      }),
      'invalid_input',
    )
    expect(error.detail).toBe('Choose a less predictable PIN.')
  })

  it('creates the account only once the code is verified', async () => {
    const phone = '+201115550000'
    let issued = ''
    const stop = mockOtpChannel.subscribe((_, code) => {
      issued = code
    })

    await auth.requestSignup({
      firstName: 'Nadia',
      lastName: 'Hassan',
      dateOfBirth: '1992-02-02',
      email: '',
      phoneNumber: phone,
      phoneCountryCode: 'EG',
      pin: '5826',
    })
    expect(issued).toMatch(/^[0-9]{6}$/)

    const success = await auth.verifySignup({ phoneNumber: phone, phoneCountryCode: 'EG', code: issued })
    expect(success.userId).toBe('USR-0000000002')

    // The new PIN works immediately.
    await expect(
      auth.login({ phoneNumber: phone, phoneCountryCode: 'EG', pin: '5826' }),
    ).resolves.toMatchObject({ userId: 'USR-0000000002' })

    stop()
  })

  describe('optional signup email needs its own code', () => {
    const phone = '+201115551111'
    const email = 'nadia@example.invalid'

    async function requestWithEmail() {
      const codes = new Map<string, string>()
      const stop = mockOtpChannel.subscribe((target, code) => codes.set(target, code))
      await auth.requestSignup({
        firstName: 'Nadia',
        lastName: 'Hassan',
        dateOfBirth: '1992-02-02',
        email,
        phoneNumber: phone,
        phoneCountryCode: 'EG',
        pin: '5826',
      })
      stop()
      return codes
    }

    it('refuses the SMS code alone', async () => {
      const codes = await requestWithEmail()
      const error = await expectApiError(
        auth.verifySignup({
          phoneNumber: phone,
          phoneCountryCode: 'EG',
          code: codes.get(phone) as string,
        }),
        'email_verification_required',
      )
      expect(error.status).toBe(400)
    })

    it('creates the account when both codes are supplied', async () => {
      const codes = await requestWithEmail()
      await expect(
        auth.verifySignup({
          phoneNumber: phone,
          phoneCountryCode: 'EG',
          code: codes.get(phone) as string,
          emailCode: codes.get(email) as string,
        }),
      ).resolves.toMatchObject({ userId: 'USR-0000000002' })
    })

    it('spends the SMS code even when the email code is wrong', async () => {
      const codes = await requestWithEmail()
      const sms = codes.get(phone) as string

      await expectApiError(
        auth.verifySignup({
          phoneNumber: phone,
          phoneCountryCode: 'EG',
          code: sms,
          emailCode: '000000',
        }),
        'invalid_code',
      )

      // The correct pair no longer works: the backend consumes the SMS code first, so
      // both are gone and only a fresh request can continue.
      await expectApiError(
        auth.verifySignup({
          phoneNumber: phone,
          phoneCountryCode: 'EG',
          code: sms,
          emailCode: codes.get(email) as string,
        }),
        'invalid_code',
      )
    })
  })

  it('burns an attempt on a malformed code and destroys the challenge on the fifth', async () => {
    await auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' })

    // Four wrong or malformed entries; the backend Lua counts both the same way.
    for (const code of ['000000', '12345', 'abcdef', '١٢٣٤٥٦']) {
      await expectApiError(
        auth.confirmPinReset({
          phoneNumber: SEEDED_PHONE,
          phoneCountryCode: 'EG',
          code,
          newPin: '5826',
        }),
        'invalid_code',
      )
    }

    // The fifth deletes the challenge, so even the right code cannot be used afterwards.
    await expectApiError(
      auth.confirmPinReset({
        phoneNumber: SEEDED_PHONE,
        phoneCountryCode: 'EG',
        code: '999999',
        newPin: '5826',
      }),
      'invalid_code',
    )
    await expectApiError(
      auth.confirmPinReset({
        phoneNumber: SEEDED_PHONE,
        phoneCountryCode: 'EG',
        code: '000000',
        newPin: '5826',
      }),
      'invalid_code',
    )
  })

  it('throttles a resend to one code every 30 seconds', async () => {
    await auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' })
    await expectApiError(
      auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' }),
      'rate_limited',
    )

    vi.setSystemTime(Date.now() + 31_000)
    await expect(
      auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' }),
    ).resolves.toBeUndefined()
  })

  it('expires a code after its time to live', async () => {
    let issued = ''
    const stop = mockOtpChannel.subscribe((_, code) => {
      issued = code
    })
    await auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' })
    stop()

    vi.setSystemTime(Date.now() + 181_000)
    await expectApiError(
      auth.confirmPinReset({
        phoneNumber: SEEDED_PHONE,
        phoneCountryCode: 'EG',
        code: issued,
        newPin: '5826',
      }),
      'invalid_code',
    )
  })

  it('completes a PIN reset and invalidates the old PIN', async () => {
    let issued = ''
    const stop = mockOtpChannel.subscribe((_, code) => {
      issued = code
    })
    await auth.requestPinReset({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG' })
    stop()

    await expect(
      auth.confirmPinReset({
        phoneNumber: SEEDED_PHONE,
        phoneCountryCode: 'EG',
        code: issued,
        newPin: '5826',
      }),
    ).resolves.toMatchObject({ userId: 'USR-0000000001' })

    await expectApiError(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: SEEDED_PIN }),
      'invalid_credentials',
    )
    await expect(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: '5826' }),
    ).resolves.toBeDefined()
  })

  it('fails closed when the security store is unreachable', async () => {
    const error = await expectApiError(
      auth.login({ phoneNumber: '+201000000503', phoneCountryCode: 'EG', pin: '5826' }),
      'security_unavailable',
    )
    expect(error.status).toBe(503)
    expect(error.isServiceDown).toBe(true)
  })

  it('refuses every call once the session is gone', async () => {
    await auth.endSession()
    await expectApiError(
      auth.login({ phoneNumber: SEEDED_PHONE, phoneCountryCode: 'EG', pin: SEEDED_PIN }),
      'session_expired',
    )
  })
})

describe('lockoutSecondsFor mirrors the backend ladder', () => {
  it('stays silent below the threshold', () => {
    expect(lockoutSecondsFor(4)).toBe(0)
  })

  it.each([
    [5, 30],
    [6, 60],
    [7, 120],
    [8, 240],
    [9, 480],
    [10, 900],
    [17, 900],
  ])('locks for %i failures for %i seconds', (failures, seconds) => {
    expect(lockoutSecondsFor(failures)).toBe(seconds)
  })
})
