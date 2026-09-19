import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../authStore'
import { CodeEntryScreen } from '../components/CodeEntryScreen'

/**
 * Mockup screen L, step 2 of 2 of sign-up.
 *
 * Resending is the one place this flow steps backwards. The backend rebuilds the whole
 * signup challenge — profile and PIN hash included — from the `signup/request/` body, so
 * a resend needs the PIN again, and the README forbids keeping a raw PIN anywhere in the
 * frontend. Rather than bend that rule for a rare path, the customer goes back to step 1
 * with everything except the PIN already filled in.
 */
export default function SignupVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const verifySignup = useAuthStore((state) => state.verifySignup)
  const returnTo = useAuthStore((state) => state.returnTo)

  const backToDetails = () => {
    useAuthStore.setState({ challenge: null, error: null })
    navigate('/kiosk/auth/signup', { replace: true })
  }

  return (
    <CodeEntryScreen
      title={t('kiosk.auth.common.step', { current: 2, total: 2 })}
      onBack={backToDetails}
      onWrongNumber={backToDetails}
      onSubmit={async (code) => {
        const ok = await verifySignup(code)
        if (ok) {
          navigate(returnTo, { replace: true })
        }
        return ok
      }}
      onResend={async () => {
        backToDetails()
        return false
      }}
    />
  )
}
