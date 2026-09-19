import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../authStore'
import { CodeEntryScreen } from '../components/CodeEntryScreen'

/**
 * FR-32, steps 3 and 4: the six-digit reset code arrives by SMS and is entered here.
 *
 * The code is not verified yet. `pin-reset/confirm/` takes the code and the new PIN in a
 * single call, so it is held for the length of one screen transition and checked on the
 * next page. If it turns out to be wrong, `confirmPinReset` clears it and the guard sends
 * the customer straight back here.
 */
export default function ResetCodePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setResetCode = useAuthStore((state) => state.setResetCode)
  const requestPinReset = useAuthStore((state) => state.requestPinReset)
  const clearPhone = useAuthStore((state) => state.clearPhone)

  const startOverWithNumber = () => {
    clearPhone()
    navigate('/kiosk/auth/phone', { replace: true })
  }

  return (
    <CodeEntryScreen
      title={t('kiosk.auth.reset.screenTitle')}
      subtitle={t('kiosk.auth.reset.body')}
      onBack={startOverWithNumber}
      onWrongNumber={startOverWithNumber}
      onSubmit={async (code) => {
        setResetCode(code)
        navigate('/kiosk/auth/reset/pin')
        return true
      }}
      onResend={requestPinReset}
    />
  )
}
