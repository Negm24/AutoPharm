import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'

/**
 * FR-33's QR fast path, kept as an explicit boundary rather than a half-built scanner.
 *
 * Two things are meant by "boundary" and both are deliberate:
 *
 * 1. Authorization. The backend's `handoff/create` mints a 30-second single-use token
 *    bound to a target terminal and session; `handoff/redeem` exchanges it for exactly
 *    the same access a phone-and-PIN sign-in would produce. A scan is a convenience
 *    credential, never an elevated one, and there is no credential inside the QR payload.
 * 2. Code. `redeemHandoff` is already wired through the gateway, so the day a scanner is
 *    fitted, the only new code is the one that produces the token string.
 *
 * There is no `getUserMedia` here on purpose. The integration table marks QR/camera
 * "Optional -> fall back to manual entry", and PRV-2 warns that any camera on the kiosk
 * may trigger a video-surveillance licence. The entry point is also behind
 * `VITE_AUTH_QR_ENABLED`, so nothing unusable is reachable by default.
 */
export default function QrSignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const redeemHandoff = useAuthStore((state) => state.redeemHandoff)
  const returnTo = useAuthStore((state) => state.returnTo)

  // The seam a scanner peripheral would drive. Nothing calls it yet.
  const onScan = async (token: string) => {
    if (await redeemHandoff(token)) {
      navigate(returnTo, { replace: true })
    }
  }
  void onScan

  return (
    <KioskScreen
      title={t('kiosk.auth.qr.screenTitle')}
      onBack={() => navigate('/kiosk/auth/phone', { replace: true })}
    >
      <div className="flex h-full items-center gap-10 px-12">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="text-[32px] font-medium tracking-tight">{t('kiosk.auth.qr.heading')}</h1>
          <p className="max-w-[470px] text-lg leading-relaxed text-text-secondary">
            {t('kiosk.auth.qr.body')}
          </p>
          <Alert tone="info">{t('kiosk.auth.qr.unavailable')}</Alert>
        </div>

        <div className="flex w-[320px] shrink-0 flex-col items-center gap-4">
          <div className="flex h-[240px] w-[240px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-sunken text-text-muted">
            <span className="font-mono text-[13px] tracking-widest">
              {t('kiosk.auth.qr.placeholder')}
            </span>
            <span className="text-[15px]">240 {'×'} 240</span>
          </div>
          <Button
            variant="secondary"
            size="secondary"
            block
            onClick={() => navigate('/kiosk/auth/phone', { replace: true })}
          >
            {t('kiosk.auth.qr.fallback')}
          </Button>
        </div>
      </div>
    </KioskScreen>
  )
}
