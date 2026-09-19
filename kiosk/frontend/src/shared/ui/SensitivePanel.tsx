import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAutoClear } from '../hooks/useAutoClear'

interface SensitivePanelProps {
  /** PRV-7 timer, independent of the session countdown. The design uses 90 seconds. */
  clearAfterMs: number
  children: ReactNode
}

/**
 * Hides personal or prescription content once its own short timer runs out, whatever the
 * session timer is doing (PRV-7). Any touch inside restarts it; once hidden, a deliberate
 * touch brings it back, so nobody is left staring at someone else's data.
 */
export function SensitivePanel({ clearAfterMs, children }: SensitivePanelProps) {
  const { t } = useTranslation()
  const { hidden, keepAlive, reveal } = useAutoClear(clearAfterMs)

  if (hidden) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-sunken px-6 py-8 text-text-secondary"
      >
        <span className="text-lg font-medium">{t('kiosk.auth.privacy.hidden')}</span>
        <span className="text-[15px] text-text-muted">{t('kiosk.auth.privacy.reveal')}</span>
      </button>
    )
  }

  return (
    <div onPointerDown={keepAlive} onFocus={keepAlive}>
      {children}
    </div>
  )
}
