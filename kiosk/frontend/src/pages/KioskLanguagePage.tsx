import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/sessionStore'

export default function KioskLanguagePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const startSession = useSessionStore((state) => state.startSession)
  const currentRemaining = useSessionStore((state) => state.currentRemaining)

  const totalSeconds = Math.max(0, Math.floor(currentRemaining / 1000))
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  const timerText = `◔ ${mm}:${ss}`

  const chooseLanguage = (lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    startSession(lang)
    navigate('/kiosk/menu', { replace: true })
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-content-panel text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-chrome-bar text-white border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold bg-primary-action">
            R
          </div>
          <span className="font-bold text-[15px]">{t('kiosk.brandName')}</span>
        </div>
        <div className="font-mono text-sm text-text-muted">{timerText}</div>
      </header>

      {/* Content — original language selection */}
      <main className="flex-1">
        <div className="flex h-full flex-col justify-center gap-8 px-15">
          <div>
            <div className="text-[40px] font-medium tracking-tight">Choose your language</div>
            <div className="mt-2 text-2xl text-text-secondary" style={{ direction: 'rtl' }}>
              اختر لغتك
            </div>
          </div>
          <div className="flex gap-5">
            <button
              type="button"
              onClick={() => chooseLanguage('en')}
              className="flex flex-1 flex-col items-start justify-center gap-2 rounded-xl px-8 py-8 bg-primary text-white"
            >
              <span className="text-4xl font-semibold">English</span>
              <span className="text-lg text-accent-soft">Continue in English</span>
            </button>
            <button
              type="button"
              onClick={() => chooseLanguage('ar')}
              className="flex flex-1 flex-col items-end justify-center gap-2 rounded-xl border-2 border-border px-8 py-8 bg-white text-text-primary"
              style={{ direction: 'rtl' }}
            >
              <span className="text-4xl font-semibold">العربية</span>
              <span className="text-lg text-text-secondary">المتابعة بالعربية</span>
            </button>
          </div>
          <div className="text-base text-text-muted">
            You can switch at any time from the top bar.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-15 py-6 bg-chrome-bar text-text-muted border-t border-border shrink-0">
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-text-muted"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <path d="M4 5c0-.6.4-1 1-1h3l2 5-2 1.3a11 11 0 0 0 5.7 5.7L15 14l5 2v3c0 .6-.4 1-1 1h-1C10.5 20 4 13.5 4 6V5Z" />
          </svg>
          <span>{t('kiosk.callPharmacist')}</span>
        </button>
        <span className="text-sm text-text-muted">{t('kiosk.footerTerminal')}</span>
      </footer>
    </div>
  )
}
