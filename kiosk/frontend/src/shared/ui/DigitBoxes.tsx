import { useTranslation } from 'react-i18next'

interface DigitBoxesProps {
  length: number
  value: string
  /** Renders a dot instead of the digit. SEC-5: PIN entry is masked. */
  masked?: boolean
  invalid?: boolean
  size?: 'pin' | 'code'
  label: string
}

// Dimensions taken from the design mockup: PIN boxes are 62x70, code boxes 64x66.
const SIZES = {
  pin: 'w-[62px] h-[70px] text-3xl',
  code: 'w-16 h-[66px] text-3xl',
}

/**
 * The masked PIN row and the six-box verification code row are the same component.
 *
 * The container is always `dir="ltr"`, even in Arabic. The boxes are a transcription
 * order, not prose: the code arrives in an SMS written left to right, so mirroring them
 * in an RTL layout would make people type it backwards.
 */
export function DigitBoxes({
  length,
  value,
  masked = false,
  invalid = false,
  size = 'pin',
  label,
}: DigitBoxesProps) {
  const { t } = useTranslation()
  const cells = Array.from({ length }, (_, index) => index)
  const focusIndex = Math.min(value.length, length - 1)

  return (
    <div dir="ltr" role="group" aria-label={label} className="flex gap-3">
      {cells.map((index) => {
        const filled = index < value.length
        const isFocused = index === focusIndex && value.length < length
        const border = invalid
          ? 'border-danger-border'
          : isFocused
            ? 'border-primary shadow-[0_0_0_4px_rgba(93,82,148,.18)]'
            : 'border-border'

        return (
          <div
            key={index}
            aria-label={t('kiosk.auth.a11y.digitOf', { index: index + 1, total: length })}
            className={`flex items-center justify-center rounded-[10px] border-2 bg-surface font-semibold text-text-primary ${SIZES[size]} ${border}`}
          >
            {filled ? (
              <span>{masked ? '•' : value[index]}</span>
            ) : isFocused ? (
              <span className="text-primary" aria-hidden="true">
                |
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
