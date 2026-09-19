export type KeyboardLayout = 'num' | 'en' | 'ar'

export type KeyAction = 'char' | 'backspace' | 'done' | 'shift' | 'space'

export interface KeyDescriptor {
  /** What the customer sees. */
  label: string
  /** What the field receives. Always ASCII for digits, whatever the label shows. */
  value: string
  action: KeyAction
  /** Flex weight, so space and done keys can be wider than a letter. */
  span?: number
}

function char(value: string, label = value): KeyDescriptor {
  return { label, value, action: 'char' }
}

const BACKSPACE: KeyDescriptor = { label: '⌫', value: '', action: 'backspace' }
const DONE: KeyDescriptor = { label: '✓', value: '', action: 'done' }

/**
 * The design calls for a 300px bottom sheet with three layouts.
 *
 * Numeric keys emit ASCII digits in both languages and, deliberately, also *display*
 * ASCII. FR-11 asks for Arabic-Indic numerals in Arabic views, but a verification code
 * arrives by SMS in ASCII and is transcribed digit by digit: showing a different glyph
 * set on the keys than on the message is a real source of mis-entry. Arabic-Indic
 * numerals belong on prices and counters, which `toLocaleDigits` handles.
 */
export const NUMERIC_ROWS: KeyDescriptor[][] = [
  [char('1'), char('2'), char('3')],
  [char('4'), char('5'), char('6')],
  [char('7'), char('8'), char('9')],
  [BACKSPACE, char('0'), DONE],
]

const EN_ROWS_BASE = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export const EN_ROWS: KeyDescriptor[][] = [
  '1234567890'.split('').map((digit) => char(digit)),
  EN_ROWS_BASE[0].split('').map((letter) => char(letter)),
  EN_ROWS_BASE[1].split('').map((letter) => char(letter)),
  [
    { label: '⇧', value: '', action: 'shift', span: 2 },
    ...EN_ROWS_BASE[2].split('').map((letter) => char(letter)),
    { ...BACKSPACE, span: 2 },
  ],
  [
    char('@'),
    char('.'),
    { label: ' ', value: ' ', action: 'space', span: 6 },
    char('-'),
    { ...DONE, span: 2 },
  ],
]

const AR_ROWS_BASE = [
  'ضصثقفغعهخحج',
  'شسيبلاتنمكط',
  'ئءؤرىةوزظ',
]

export const AR_ROWS: KeyDescriptor[][] = [
  '1234567890'.split('').map((digit) => char(digit)),
  AR_ROWS_BASE[0].split('').map((letter) => char(letter)),
  AR_ROWS_BASE[1].split('').map((letter) => char(letter)),
  [
    ...AR_ROWS_BASE[2].split('').map((letter) => char(letter)),
    { ...BACKSPACE, span: 2 },
  ],
  [
    { label: ' ', value: ' ', action: 'space', span: 8 },
    { ...DONE, span: 2 },
  ],
]

export function rowsFor(layout: KeyboardLayout): KeyDescriptor[][] {
  if (layout === 'num') {
    return NUMERIC_ROWS
  }
  return layout === 'ar' ? AR_ROWS : EN_ROWS
}
