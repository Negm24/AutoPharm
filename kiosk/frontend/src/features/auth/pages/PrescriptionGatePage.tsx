import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, KioskScreen, SensitivePanel } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { PRIVACY_AUTO_CLEAR_MS } from '../constants'

/**
 * Mockup screen I. FR-29: sign-in is asked for only at the point it buys the customer
 * something, and the gate explains why before asking for anything.
 *
 * Three ways out, exactly as the design specifies: sign in, ask the pharmacist, or find
 * something that needs no prescription. Feature 2 links here with `?reason=&return=`
 * when it hits a prescription-only product.
 */
export default function PrescriptionGatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const beginAuth = useAuthStore((state) => state.beginAuth)

  const returnTo = params.get('return') ?? '/kiosk/menu'
  const reason = (params.get('reason') ?? 'prescription') as 'prescription' | 'insurance' | 'orders'

  const signIn = () => {
    beginAuth({ reason, returnTo })
    navigate('/kiosk/auth/phone')
  }

  return (
    <KioskScreen
      title={t('kiosk.auth.common.signIn')}
      onBack={() => navigate(returnTo, { replace: true })}
    >
      <div className="flex h-full gap-10 px-12 py-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="w-fit rounded-md bg-accent-soft px-3 py-1.5 text-[15px] font-semibold text-primary">
            {t('kiosk.auth.gate.badge')}
          </span>

          {/* PRV-7: anything identifying a medicine clears on its own 90-second timer. */}
          <SensitivePanel clearAfterMs={PRIVACY_AUTO_CLEAR_MS}>
            <h1 className="text-[32px] font-medium leading-tight tracking-tight">
              {t('kiosk.auth.gate.title')}
            </h1>
            <p className="mt-2 max-w-[470px] text-lg leading-relaxed text-text-secondary">
              {t('kiosk.auth.gate.body')}
            </p>
          </SensitivePanel>

          <div className="mt-auto flex flex-col gap-3">
            <Button block onClick={signIn}>
              {t('kiosk.auth.gate.signInCta')}
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" size="secondary" className="flex-1">
                {t('kiosk.auth.common.askPharmacist')}
              </Button>
              <Button
                variant="secondary"
                size="secondary"
                className="flex-1"
                onClick={() => navigate('/kiosk/menu', { replace: true })}
              >
                {t('kiosk.auth.gate.browseCta')}
              </Button>
            </div>
          </div>
        </div>

        <aside className="flex w-[320px] shrink-0 flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface-sunken p-4">
            <div className="font-mono text-[13px] tracking-widest text-text-muted">
              {t('kiosk.auth.gate.needsTitle')}
            </div>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                t('kiosk.auth.gate.needsOne'),
                t('kiosk.auth.gate.needsTwo'),
                t('kiosk.auth.gate.needsThree'),
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-3 text-[17px] leading-snug">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-[15px] leading-snug text-text-muted">
            {t('kiosk.auth.gate.clearNotice')}
          </p>
        </aside>
      </div>
    </KioskScreen>
  )
}
