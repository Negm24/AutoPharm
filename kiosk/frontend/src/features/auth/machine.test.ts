import { describe, expect, it } from 'vitest'
import { deriveStep, pathForStep, type AuthSnapshot } from './machine'

const NOW = 1_800_000_000_000

const base: AuthSnapshot = {
  mode: 'guest',
  serviceDown: false,
  lockedUntil: null,
  challenge: null,
  resetCode: null,
  phone: null,
}

/**
 * The guards route from `deriveStep`, so its precedence is what stops a refresh or a
 * typed URL leaving the address bar and the store disagreeing.
 */
describe('deriveStep precedence', () => {
  it('starts at the phone screen', () => {
    expect(deriveStep(base, NOW)).toBe('phone')
  })

  it('moves to the PIN screen once a number is known', () => {
    expect(deriveStep({ ...base, phone: {} }, NOW)).toBe('pin')
  })

  it('routes a signup challenge to its verification screen', () => {
    expect(deriveStep({ ...base, phone: {}, challenge: { kind: 'signup' } }, NOW)).toBe(
      'signup_verify',
    )
  })

  it('splits the reset flow on whether the code has been entered', () => {
    const resetting = { ...base, phone: {}, challenge: { kind: 'reset' as const } }
    expect(deriveStep(resetting, NOW)).toBe('reset_verify')
    expect(deriveStep({ ...resetting, resetCode: '123456' }, NOW)).toBe('reset_pin')
  })

  it('puts a signed-in customer on the account screen', () => {
    expect(deriveStep({ ...base, mode: 'authenticated', phone: {} }, NOW)).toBe('done')
  })

  it('outranks a half-finished flow when the account is locked', () => {
    const locked = {
      ...base,
      phone: {},
      challenge: { kind: 'signup' as const },
      lockedUntil: NOW + 30_000,
    }
    expect(deriveStep(locked, NOW)).toBe('locked')
  })

  it('releases the lock screen once the countdown has passed', () => {
    expect(deriveStep({ ...base, phone: {}, lockedUntil: NOW - 1 }, NOW)).toBe('pin')
  })

  it('outranks everything, including a signed-in session, when auth is down', () => {
    const down = { ...base, mode: 'authenticated' as const, serviceDown: true }
    expect(deriveStep(down, NOW)).toBe('unavailable')
  })
})

describe('pathForStep', () => {
  it('gives every step a route the router actually serves', () => {
    expect(pathForStep('phone')).toBe('/kiosk/auth/phone')
    expect(pathForStep('reset_pin')).toBe('/kiosk/auth/reset/pin')
    expect(pathForStep('done')).toBe('/kiosk/account')
  })
})
