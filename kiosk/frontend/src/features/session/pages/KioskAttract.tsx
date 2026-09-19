import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function KioskAttract() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className="flex h-screen w-screen cursor-pointer select-none items-center justify-center bg-content-panel"
      onClick={() => navigate('/kiosk/language', { replace: true })}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          navigate('/kiosk/language', { replace: true })
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex h-screen w-screen flex-col gap-8 bg-chrome-ground p-8 text-white">
        <div className="flex min-h-0 flex-1 gap-8">
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold bg-primary-action">
                  R
                </div>
                <div className="flex items-center gap-3 text-[15px]">
                  <span className="font-bold">{t('kiosk.brandName')}</span>
                  <span className="text-text-muted">• {t('kiosk.terminalLabel')}</span>
                </div>
              </div>

              <div className="flex flex-1 items-center">
                <div className="flex flex-col gap-4">
                  <h1 className="text-6xl font-bold leading-[1.1] tracking-tight">
                    Medicine,
                    <br />
                    without the
                    queue.
                  </h1>

                  <p
                    className="text-lg leading-relaxed text-text-dim"
                    style={{ maxWidth: 400 }}
                  >
                    {t('kiosk.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-primary-action"
              >
                <div className="h-3 w-3 rounded-full bg-white" />
              </div>
              <div className="flex gap-4 items-baseline">
                <span className="text-2xl font-bold">{t('kiosk.touchToStart')}</span>
                <span className="text-[22px] font-bold" style={{ direction: 'rtl', color: '#d1d5db' }}>
                  {t('kiosk.touchToStartAr')}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex flex-1 flex-col justify-between rounded-xl border border-dashed border-border-strong bg-white/2 p-6"
          >
            <div
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-black/20 text-text-muted"
              style={{ borderColor: '#3f4361' }}
            >
              <span className="text-sm font-bold tracking-wider">PROMO IMAGE SLOT</span>
              <span className="text-xs">1128 × 600 @2x</span>
            </div>

            <div className="mt-4 flex shrink-0 gap-2">
              <div className="h-1 w-8 rounded-full bg-accent" />
              <div className="h-1 w-8 rounded-full bg-[#3f4361]" />
              <div className="h-1 w-8 rounded-full bg-[#3f4361]" />
            </div>

            <ul className="mt-6 flex shrink-0 flex-col gap-3">
              <li className="flex items-center gap-3 text-[15px] text-text-dim">
                <span className="h-2 w-2 rounded-full bg-success" />
                {t('kiosk.status.dispenserOnline')} · 214 items
              </li>
              <li className="flex items-center gap-3 text-[15px] text-text-dim">
                <span className="h-2 w-2 rounded-full bg-success" />
                {t('kiosk.status.pharmacistOnCall')}
              </li>
              <li className="flex items-center gap-3 text-[15px] text-text-dim">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {t('kiosk.status.cardAccepted')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
