const ARABIC_INDIC_START = 0x0660
const EXTENDED_ARABIC_INDIC_START = 0x06f0
const FULLWIDTH_START = 0xff10

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/**
 * The backend accepts ASCII digits only (`^[0-9]{4}$` for PINs, `^[0-9]{6}$` for codes),
 * so every digit entering the app is folded to ASCII at the input boundary. Arabic-Indic
 * and fullwidth forms are what a physical keyboard or a paste can realistically produce.
 */
export function toAsciiDigits(value: string): string {
  let result = ''
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code >= ARABIC_INDIC_START && code <= ARABIC_INDIC_START + 9) {
      result += String(code - ARABIC_INDIC_START)
    } else if (code >= EXTENDED_ARABIC_INDIC_START && code <= EXTENDED_ARABIC_INDIC_START + 9) {
      result += String(code - EXTENDED_ARABIC_INDIC_START)
    } else if (code >= FULLWIDTH_START && code <= FULLWIDTH_START + 9) {
      result += String(code - FULLWIDTH_START)
    } else {
      result += character
    }
  }
  return result
}

/** Display only. Never apply this to a value that will be sent to the backend. */
export function toLocaleDigits(value: string, lang: string): string {
  if (!lang.startsWith('ar')) {
    return value
  }
  return value.replace(/[0-9]/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit)
}

/** Keep only ASCII digits, capped at `maxLength`. Used by every numeric field. */
export function digitsOnly(value: string, maxLength: number): string {
  return toAsciiDigits(value).replace(/[^0-9]/g, '').slice(0, maxLength)
}
