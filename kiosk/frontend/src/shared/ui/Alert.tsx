import type { ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'info' | 'success'

const TONES: Record<Tone, string> = {
  error: 'bg-danger-soft border-danger-border text-text-primary',
  warning: 'bg-warning-soft border-warning text-text-primary',
  info: 'bg-accent-soft border-accent text-text-primary',
  success: 'bg-success-soft border-success text-text-primary',
}

interface AlertProps {
  tone?: Tone
  children: ReactNode
  action?: ReactNode
}

/**
 * FR-71 wants designed error states and FR-72 wants every one of them to offer a way
 * forward, which is what `action` is for. `role="alert"` so a screen reader announces it.
 */
export function Alert({ tone = 'error', children, action }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-4 rounded-xl border-2 px-5 py-4 text-lg ${TONES[tone]}`}
    >
      <span>{children}</span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  )
}
