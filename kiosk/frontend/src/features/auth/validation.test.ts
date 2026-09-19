import { describe, expect, it } from 'vitest'
import {
  formatNationalPhone,
  maskPhone,
  normalizeEgyptianPhone,
  parseDateOfBirth,
  validateEmail,
  validateName,
  validatePin,
} from './validation'

/**
 * These cases are lifted from the backend's own tests
 * (`apps/accounts/tests/test_models.py::test_pin_policy_is_enforced_by_manager` and
 * `security/policy.py`). If this file and the backend ever disagree, the UI would accept
 * a PIN the server rejects — invisible when clicking through, obvious here.
 */
describe('validatePin mirrors security/policy.py', () => {
  it('accepts the backend fixture PIN', () => {
    expect(validatePin('5826')).toBeNull()
  })

  it.each(['582', '58260', '58a6', '５８２６', '٥٨٢٦'])(
    'rejects %s as the wrong length or not ASCII',
    (value) => {
      expect(validatePin(value)).toBe('length')
    },
  )

  it.each(['0000', '1111', '9999'])('rejects repeated digits %s', (value) => {
    expect(validatePin(value)).toBe('repeated')
  })

  it.each(['1234', '4321', '0123', '9876', '9012'])('rejects the sequence %s', (value) => {
    expect(validatePin(value)).toBe('sequence')
  })

  it.each(['1212', '1122', '1004', '2000', '6969', '2580', '0852', '1010', '1313'])(
    'rejects the blocklisted %s',
    (value) => {
      expect(validatePin(value)).toBe('blocked')
    },
  )
})

describe('normalizeEgyptianPhone mirrors FR-30a', () => {
  it.each(['01012345678', '1012345678', '+201012345678', '0020 101 234 5678', '010 1234 5678'])(
    'canonicalises %s',
    (input) => {
      expect(normalizeEgyptianPhone(input)).toMatchObject({
        ok: true,
        e164: '+201012345678',
        national: '01012345678',
      })
    },
  )

  it.each(['01112345678', '01212345678', '01512345678'])('accepts the %s prefix', (input) => {
    expect(normalizeEgyptianPhone(input).ok).toBe(true)
  })

  it('rejects a non-mobile prefix', () => {
    expect(normalizeEgyptianPhone('01312345678')).toMatchObject({ ok: false, issue: 'prefix' })
  })

  it('rejects a short number', () => {
    expect(normalizeEgyptianPhone('0101234')).toMatchObject({ ok: false, issue: 'length' })
  })

  it('reports an empty field distinctly so the message can differ', () => {
    expect(normalizeEgyptianPhone('')).toMatchObject({ ok: false, issue: 'empty' })
  })

  it('folds Arabic-Indic digits to ASCII before parsing', () => {
    expect(normalizeEgyptianPhone('٠١٠١٢٣٤٥٦٧٨').e164).toBe(
      '+201012345678',
    )
  })
})

describe('display helpers never leak a full number', () => {
  it('groups the national form the way it is read', () => {
    expect(formatNationalPhone('01012345678')).toBe('010 1234 5678')
  })

  it('masks all but the last three digits', () => {
    const masked = maskPhone('+201012345678')
    expect(masked).toContain('678')
    expect(masked).not.toContain('12345')
  })
})

describe('profile fields match the backend serializers', () => {
  it.each(['Yousef', 'José', "O'Neill", 'Smith-Jones', 'D’Arcy'])(
    'accepts the Latin name %s',
    (value) => {
      expect(validateName(value)).toBeNull()
    },
  )

  it.each(['يوسف', 'Alex123', '---'])('rejects %s', (value) => {
    expect(validateName(value)).toBe('latin')
  })

  it('requires a name at all', () => {
    expect(validateName('   ')).toBe('required')
  })

  it('converts DDMMYYYY to the ISO date the API expects', () => {
    expect(parseDateOfBirth('21041995')).toEqual({ issue: null, iso: '1995-04-21' })
  })

  it('rejects an impossible date', () => {
    expect(parseDateOfBirth('31021995').issue).toBe('invalid')
  })

  it('rejects a future date of birth, as validate_date_not_in_future does', () => {
    const nextYear = String(new Date().getFullYear() + 1)
    expect(parseDateOfBirth(`0101${nextYear}`).issue).toBe('future')
  })

  it('treats email as optional but checks anything present', () => {
    expect(validateEmail('')).toBeNull()
    expect(validateEmail('you@example.com')).toBeNull()
    expect(validateEmail('nope')).toBe('invalid')
  })
})
