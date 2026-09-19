import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCountdown } from '../../../shared/hooks'
import { Alert, Button, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { GuestEscape } from '../components/GuestEscape'

/**
 * FR-34: repeated wrong PINs lock the account with exponential back-off.
 *
 * This countdown is presentational. SEC-4 puts the real counter on the server, so when it
 * reaches zero the screen simply lets the customer try again — and if the server is still
 * locked it answers 429 and lands them back here with a fresh countdown. Never the other
 * way round: the client cannot decide the lock is over.
 */
export default function LockedOutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const lockedUntil = useAuthStore((state) => state.lockedUntil)
  const countdown = useCountdown(lockedUntil)

  useEffect(() => {
    if (countdown.isDone && lockedUntil !== null) {
      useAuthStore.setState({ lockedUntil: null, error: null, pinFailures: 0 })
    }
  }, [countdown.isDone, lockedUntil])

  return (
    <KioskScreen
      title={t('kiosk.auth.locked.screenTitle')}
      onBack={() => navigate('/kiosk/menu', { replace: true })}
    >
      <div className="flex h-full items-center gap-10 px-12">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="text-[32px] font-medium tracking-tight">
            {t('kiosk.auth.locked.heading')}
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-text-secondary">
            {t('kiosk.auth.locked.body')}
          </p>
          <Alert tone="warning">
            {countdown.isDone
              ? t('kiosk.auth.locked.retryNow')
              : t('kiosk.auth.locked.retryIn', { time: countdown.label })}
          </Alert>
        </div>

        <div className="flex w-[320px] shrink-0 flex-col gap-4">
          <GuestEscape emphasis />
          <Button
            variant="secondary"
            size="secondary"
            block
            disabled={!countdown.isDone}
            onClick={() => navigate('/kiosk/auth/phone', { replace: true })}
          >
            {t('kiosk.auth.common.tryAgain')}
          </Button>
        </div>
      </div>
    </KioskScreen>
  )
}
