import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { useAuthErrorText } from '../components/useAuthErrorText'
import { GuestEscape } from '../components/GuestEscape'

/**
 * NFR-8: sign-in needs connectivity, and when it is unavailable the kiosk must "degrade
 * gracefully to a clearly explained cash-and-OTC mode rather than taking the terminal
 * offline". This is that screen.
 *
 * It is reached from `security_unavailable` (Redis down — every auth call fails closed),
 * `sms_unavailable`, and plain network failures. The guest route is the primary action,
 * because shopping still works perfectly and FR-72 says never dead-end.
 */
export default function AuthUnavailablePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const error = useAuthStore((state) => state.error)
  const clearPhone = useAuthStore((state) => state.clearPhone)
  const describe = useAuthErrorText()

  const detail = describe(error)
  const offline = error?.isOffline ?? false

  return (
    <KioskScreen
      title={t('kiosk.auth.unavailable.screenTitle')}
      onBack={() => navigate('/kiosk/menu', { replace: true })}
    >
      <div className="flex h-full items-center gap-10 px-12">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="text-[32px] font-medium tracking-tight">
            {offline ? t('kiosk.auth.offline.heading') : t('kiosk.auth.unavailable.heading')}
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-text-secondary">
            {offline ? t('kiosk.auth.offline.body') : t('kiosk.auth.unavailable.body')}
          </p>
          {detail ? <p className="text-[15px] text-text-muted">{detail}</p> : null}
        </div>

        <div className="flex w-[320px] shrink-0 flex-col gap-4">
          <GuestEscape emphasis />
          <Button
            variant="secondary"
            size="secondary"
            block
            onClick={() => {
              // Drop the number as well as the error: retrying with the same one that
              // just failed would walk straight back into this screen.
              useAuthStore.setState({ serviceDown: false, error: null })
              clearPhone()
              navigate('/kiosk/auth/phone', { replace: true })
            }}
          >
            {t('kiosk.auth.common.tryAgain')}
          </Button>
        </div>
      </div>
    </KioskScreen>
  )
}
