import type { ReactNode } from 'react'

interface TextFieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  hint?: ReactNode
  error?: string | null
  active?: boolean
  dir?: 'ltr' | 'rtl'
  /** Rendered inside the field, before the value. Used for the +20 country chip. */
  prefix?: ReactNode
  onFocus: () => void
}

/**
 * A read-only field driven by the on-screen keyboard.
 *
 * `inputMode="none"` and `readOnly` keep the operating system keyboard from appearing on
 * a wall terminal, and autofill is switched off everywhere: SEC-6 runs the kiosk locked
 * down, and a device used by strangers must never offer one person's details to the next.
 */
export function TextField({
  id,
  label,
  value,
  placeholder,
  hint,
  error,
  active = false,
  dir = 'ltr',
  prefix,
  onFocus,
}: TextFieldProps) {
  const border = error
    ? 'border-danger-border'
    : active
      ? 'border-primary shadow-[0_0_0_4px_rgba(93,82,148,.18)]'
      : 'border-border'

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-medium text-text-secondary">
        {label}
      </label>

      <div
        // An LTR field carries its direction on the row, not just the input: otherwise the
        // "+20" chip lands on the wrong side of the number in an Arabic layout.
        dir={dir}
        className={`flex h-[62px] items-center gap-3 rounded-xl border-2 bg-surface px-4 ${border}`}
        onClick={onFocus}
      >
        {prefix ? <span className="shrink-0 text-lg text-text-secondary">{prefix}</span> : null}
        <input
          id={id}
          dir={dir}
          value={value}
          placeholder={placeholder}
          readOnly
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={onFocus}
          aria-invalid={Boolean(error)}
          aria-errormessage={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent text-xl text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      {error ? (
        <span id={`${id}-error`} className="text-[15px] text-emergency">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[15px] text-text-muted">{hint}</span>
      ) : null}
    </div>
  )
}
