import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { rowsFor, type KeyboardLayout } from './keyboard/layouts'

interface KeyboardSheetProps {
  layout: KeyboardLayout
  onKey: (value: string) => void
  onBackspace: () => void
  onDone?: () => void
  doneDisabled?: boolean
}

/**
 * The on-screen keyboard: a 300px bottom sheet with numeric, English and Arabic layouts,
 * exactly as the design specifies. C-1 says the terminal is a 1024x600 touchscreen with
 * no physical keyboard, so this is the only way anything gets typed.
 *
 * Feature 2's product search needs the same component; that is why it lives in `shared`
 * rather than inside the auth feature.
 */
export function KeyboardSheet({
  layout,
  onKey,
  onBackspace,
  onDone,
  doneDisabled = false,
}: KeyboardSheetProps) {
  const { t } = useTranslation()
  const [shifted, setShifted] = useState(false)
  const rows = rowsFor(layout)
  const isNumeric = layout === 'num'

  return (
    <div
      // The Arabic letter layout mirrors; the numeric pad never does, so a phone number
      // and a PIN are typed in the same order in both languages.
      dir={layout === 'ar' ? 'rtl' : 'ltr'}
      role="group"
      aria-label={t('kiosk.auth.a11y.keyboard')}
      className="h-[300px] shrink-0 bg-chrome-bar px-4 py-3"
    >
      <div
        className={`mx-auto flex h-full flex-col justify-center gap-2 ${isNumeric ? 'w-[340px]' : 'w-full'}`}
      >
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-1 gap-2">
            {row.map((key, keyIndex) => {
              const isAction = key.action !== 'char'
              const display =
                key.action === 'space'
                  ? ''
                  : shifted && key.action === 'char'
                    ? key.label.toUpperCase()
                    : key.label

              return (
                <button
                  key={`${rowIndex}-${keyIndex}`}
                  type="button"
                  disabled={key.action === 'done' && doneDisabled}
                  aria-label={key.action === 'backspace' ? t('kiosk.auth.a11y.backspace') : undefined}
                  style={{ flexGrow: key.span ?? 1 }}
                  onClick={() => {
                    if (key.action === 'backspace') {
                      onBackspace()
                      return
                    }
                    if (key.action === 'done') {
                      onDone?.()
                      return
                    }
                    if (key.action === 'shift') {
                      setShifted((current) => !current)
                      return
                    }
                    onKey(shifted ? key.value.toUpperCase() : key.value)
                    if (shifted) {
                      setShifted(false)
                    }
                  }}
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-lg text-2xl font-medium transition-transform duration-100 active:translate-y-[2px] disabled:opacity-40 ${
                    key.action === 'done'
                      ? 'bg-primary text-white'
                      : isAction
                        ? 'bg-key-dim text-text-primary'
                        : 'bg-key text-text-primary'
                  }`}
                >
                  {display}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
