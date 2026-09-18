import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../stores/sessionStore'

export default function KioskMenuPage() {
  const { t, i18n } = useTranslation()
  const currentRemaining = useSessionStore((state) => state.currentRemaining)

  const totalSeconds = Math.max(0, Math.floor(currentRemaining / 1000))
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  const isArabic = i18n.language === 'ar'

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar'
    i18n.changeLanguage(next)
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-content-panel text-text-primary">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 h-14 bg-chrome-bar text-white border-b border-border shrink-0"
        style={{ direction: isArabic ? 'rtl' : 'ltr' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold bg-primary-action">
            R
          </div>
          <span className="font-bold text-[15px]">{t('kiosk.brandName')}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-white/90"
            aria-label={t('kiosk.search')}
            onClick={() => {}}
          >
            <span>⌕</span>
            <span>{t('kiosk.search')}</span>
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-white/90"
            onClick={toggleLanguage}
          >
            {isArabic ? t('kiosk.languageEnglish') : t('kiosk.languageArabic')}
          </button>
          <div className="flex items-center gap-1 rounded-full bg-primary-action px-3 py-1.5 text-sm font-semibold text-white">
            <span>◔</span>
            <span className="font-mono">{mm}:{ss}</span>
          </div>
        </div>
      </header>

      {/* Content — temporary demo */}
      <main className="flex-1">
        <div className="flex h-full flex-col justify-center items-center gap-4 px-4">
          <h1 className="text-2xl font-medium">{t('kiosk.menu.welcome')}</h1>
          <p className="text-base text-text-secondary">{t('kiosk.menu.subtitle')}</p>
          <div className="flex flex-col gap-3 w-72">
            <button type="button" className="rounded-lg border border-border bg-white px-4 py-3 text-left text-text-primary transition hover:bg-white/90">
              <div className="font-medium">{t('kiosk.menu.demoBtn1')}</div>
              <div className="mt-1 text-sm text-text-muted">Temporary demo only</div>
            </button>
            <button type="button" className="rounded-lg border border-border bg-white px-4 py-3 text-left text-text-primary transition hover:bg-white/90">
              <div className="font-medium">{t('kiosk.menu.demoBtn2')}</div>
              <div className="mt-1 text-sm text-text-muted">Temporary demo only</div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="flex items-center gap-4 shrink-0 px-4 h-16 bg-chrome-bar border-t border-border text-sm"
        style={{ direction: isArabic ? 'rtl' : 'ltr' }}
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

       <div className="flex flex-1 items-center justify-center px-4 py-2 text-center text-sm font-normal text-text-muted">
        {t('kiosk.emergency')}
      </div>

       <button
  type="button"
  onClick={() => {
    useSessionStore.getState().endSession()
    window.location.href = '/kiosk/attract'
  }}
  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emergency px-3 py-1.5 text-sm font-medium text-white"
>
  <span>✕</span>
  <span>{t('kiosk.startOver')}</span>
</button>
      </footer>
    </div>
  )
}