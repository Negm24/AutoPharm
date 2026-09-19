import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../features/session/sessionStore'
import { formatDuration } from '../format/duration'
import { useDirection } from '../hooks/useDirection'

interface KioskScreenProps {
  title: string
  onBack?: () => void
  /** Replaces the footer with the 300px keyboard sheet, as the design does. */
  keyboard?: ReactNode
  children: ReactNode
}

/**
 * The persistent kiosk chrome: a 56px header and a 48px footer around the content, on a
 * fixed 1024x600 screen that never scrolls (NFR-12).
 *
 * FR-6 requires Cancel/Start Over to be reachable from every in-session screen, so it
 * lives here rather than on each page. When the keyboard is up it takes the footer's
 * place, matching the design's "keyboard covers none of the fields" arithmetic:
 * 56 header + 244 content + 300 keyboard = 600.
 */
export function KioskScreen({ title, onBack, keyboard, children }: KioskScreenProps) {
  const { t, i18n } = useTranslation()
  const { dir, isRtl } = useDirection()
  const currentRemaining = useSessionStore((state) => state.currentRemaining)

  const toggleLanguage = () => {
    const next = isRtl ? 'en' : 'ar'
    void i18n.changeLanguage(next)
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = next
  }

  const startOver = () => {
    // A full document navigation, as Feature 1 does: it wipes every token and draft in
    // memory on the way out, which is the strongest guarantee of FR-4 available.
    useSessionStore.getState().endSession()
    window.location.href = '/kiosk/attract'
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-content-panel text-text-primary">
      <header
        dir={dir}
        className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-chrome-bar px-4 text-white"
      >
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-text-muted bg-[#292b31] px-4 text-base font-medium text-accent-soft active:translate-y-[1px]"
            >
              <span aria-hidden="true">{dir === 'rtl' ? '→' : '←'}</span>
              <span>{t('kiosk.auth.common.back')}</span>
            </button>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-action text-base font-bold">
              R
            </div>
          )}
          <span className="truncate text-[17px] font-medium">{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* The design carries this chip on the identity screens too: someone who picked
              the wrong language at the start must not be trapped mid sign-up. */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-lg border border-border px-3 py-1.5 text-base font-medium text-white/90"
          >
            {isRtl ? t('kiosk.languageEnglish') : t('kiosk.languageArabic')}
          </button>

          <div className="flex items-center gap-1 rounded-full bg-primary-action px-3 py-1.5 text-base font-semibold">
            <span aria-hidden="true">{'◔'}</span>
            <span className="font-mono">{formatDuration(currentRemaining)}</span>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {keyboard ?? (
        <footer
          dir={dir}
          className="flex h-12 shrink-0 items-center justify-between gap-4 border-t border-border bg-chrome-bar px-4 text-[15px]"
        >
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-text-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <path d="M4 5c0-.6.4-1 1-1h3l2 5-2 1.3a11 11 0 0 0 5.7 5.7L15 14l5 2v3c0 .6-.4 1-1 1h-1C10.5 20 4 13.5 4 6V5Z" />
            </svg>
            <span>{t('kiosk.callPharmacist')}</span>
          </button>

          <button
            type="button"
            onClick={startOver}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emergency px-3 py-1.5 font-medium text-white"
          >
            <span aria-hidden="true">{'✕'}</span>
            <span>{t('kiosk.startOver')}</span>
          </button>
        </footer>
      )}
    </div>
  )
}
