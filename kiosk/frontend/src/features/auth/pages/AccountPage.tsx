import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { GuestEscape } from '../components/GuestEscape'
import { maskPhone } from '../validation'

/**
 * FR-35: sign-out is available manually at any time, not only when the session ends.
 *
 * Only a first name and a masked number are shown. The profile endpoint returns the full
 * number, the email and the date of birth, but none of that needs to be on a screen in a
 * public place (PRV-6, SEC-5) — enough to confirm "this is my session" and no more.
 */
export default function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const mode = useAuthStore((state) => state.mode)
  const customer = useAuthStore((state) => state.customer)
  const signOut = useAuthStore((state) => state.signOut)
  const status = useAuthStore((state) => state.status)

  const guest = mode !== 'authenticated'

  return (
    <KioskScreen
      title={t('kiosk.auth.account.screenTitle')}
      onBack={() => navigate('/kiosk/menu', { replace: true })}
    >
      <div className="flex h-full items-center gap-10 px-12">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="text-[32px] font-medium tracking-tight">
            {guest ? t('kiosk.auth.account.guestHeading') : t('kiosk.auth.account.heading')}
          </h1>

          {guest ? (
            <p className="max-w-[520px] text-lg leading-relaxed text-text-secondary">
              {t('kiosk.auth.account.guestBody')}
            </p>
          ) : (
            <dl className="flex flex-col gap-3 text-lg">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-text-muted">
                  {t('kiosk.auth.account.signedInAs')}
                </dt>
                <dd className="font-medium">{customer?.firstName ?? '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-text-muted">{t('kiosk.auth.account.mobile')}</dt>
                <dd className="font-medium">
                  <bdi dir="ltr">{customer ? maskPhone(customer.phoneNumber) : '—'}</bdi>
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex w-[320px] shrink-0 flex-col gap-4">
          {guest ? (
            <>
              <Button block onClick={() => navigate('/kiosk/auth/phone')}>
                {t('kiosk.auth.common.signIn')}
              </Button>
              <GuestEscape />
            </>
          ) : (
            <Button
              variant="secondary"
              block
              busy={status === 'submitting'}
              onClick={() => {
                void signOut()
                navigate('/kiosk/menu', { replace: true })
              }}
            >
              {t('kiosk.auth.account.signOut')}
            </Button>
          )}
        </div>
      </div>
    </KioskScreen>
  )
}
