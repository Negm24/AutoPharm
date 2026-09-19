import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/ui'
import { useAuthStore } from '../authStore'

/**
 * The design's rule, verbatim: "the guest route is never hidden". This sits on every
 * auth screen, including the lockout and service-unavailable ones, because FR-36 says an
 * account is never a precondition for buying over-the-counter items and FR-34c says an
 * SMS failure must not strand anyone.
 *
 * It fires no network request. A guest is a kiosk session with nobody attached, so
 * staying a guest is the absence of a call (PRV-6).
 */
export function GuestEscape({ emphasis = false }: { emphasis?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest)
  const returnTo = useAuthStore((state) => state.returnTo)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] text-text-muted">{t('kiosk.auth.common.guestNote')}</span>
      <Button
        variant={emphasis ? 'primary' : 'secondary'}
        size={emphasis ? 'primary' : 'secondary'}
        onClick={() => {
          continueAsGuest()
          navigate(returnTo, { replace: true })
        }}
      >
        {t('kiosk.auth.common.continueAsGuest')}
      </Button>
    </div>
  )
}
