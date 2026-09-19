import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'emergency' | 'link'
type Size = 'primary' | 'secondary'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  busy?: boolean
  block?: boolean
  /** Shown under a disabled button. FR-72: never dead-end, always explain. */
  reason?: string
  children: ReactNode
}

// NFR-13: touch targets are at least 56px and primary actions at least 64px.
// NFR-14: nothing below 15px, body text at least 18px.
const SIZES: Record<Size, string> = {
  primary: 'h-16 px-6 text-xl',
  secondary: 'h-14 px-5 text-lg',
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-[0_3px_0_var(--color-primary-dark)] active:translate-y-[2px] active:shadow-none',
  secondary: 'bg-surface text-text-primary border-2 border-border active:bg-surface-sunken',
  ghost: 'bg-transparent text-text-secondary border-2 border-transparent active:bg-surface-sunken',
  emergency: 'bg-emergency text-white active:translate-y-[2px]',
  link: 'bg-transparent text-primary underline underline-offset-4',
}

/**
 * The kiosk's only button. Touch feedback is an `active:` transform rather than a hover
 * state, because NFR-18 forbids depending on hover and NFR-1 wants feedback under 100ms.
 */
export function Button({
  variant = 'primary',
  size = 'primary',
  busy = false,
  block = false,
  reason,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || busy
  const shape = variant === 'link' ? 'text-lg' : `rounded-xl font-semibold ${SIZES[size]}`

  return (
    <div className={block ? 'flex w-full flex-col gap-2' : 'flex flex-col gap-2'}>
      <button
        type="button"
        disabled={isDisabled}
        aria-busy={busy}
        className={`flex items-center justify-center gap-3 transition-[transform,background-color] duration-100 ${shape} ${VARIANTS[variant]} ${isDisabled ? 'opacity-45' : ''} ${block ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {busy ? <Spinner /> : null}
        <span>{children}</span>
      </button>
      {isDisabled && reason ? (
        <span className="text-[15px] text-text-muted">{reason}</span>
      ) : null}
    </div>
  )
}
