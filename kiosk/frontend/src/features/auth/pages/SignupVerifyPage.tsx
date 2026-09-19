import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../authStore'
import { CodeEntryScreen } from '../components/CodeEntryScreen'

/**
 * Mockup screen L, step 2 of 2 of sign-up.
 *
 * When an email was supplied, `signup/request/` issues a second code to it and
 * `signup/verify/` refuses without both — the backend will not attach an unproven address
 * to a durable identity. Rather than squeeze two six-box rows into the 244px the keyboard
 * leaves, the screen asks for them in sequence, the same way `NewPinPage` asks for a PIN
 * and then its confirmation. With no email this is a single step, exactly as before.
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
  const email = useAuthStore((state) => state.signupDraft?.email ?? '')

  // Held only between the two stages of one submission, never in the store.
  const [smsCode, setSmsCode] = useState<string | null>(null)

  const needsEmailCode = email !== ''
  const onEmailStage = needsEmailCode && smsCode !== null

  const backToDetails = () => {
    setSmsCode(null)
    useAuthStore.setState({ challenge: null, error: null })
    navigate('/kiosk/auth/signup', { replace: true })
  }

  const finish = async (code: string, emailCode?: string) => {
    const ok = await verifySignup(code, emailCode)
    if (ok) {
      navigate(returnTo, { replace: true })
    } else {
      // Both codes are spent once a submission fails; start the pair over.
      setSmsCode(null)
    }
    return ok
  }

  return (
    <CodeEntryScreen
      // Remounts between stages, which clears the six boxes for the second code.
      key={onEmailStage ? 'email' : 'sms'}
      title={t('kiosk.auth.common.step', { current: 2, total: 2 })}
      heading={onEmailStage ? t('kiosk.auth.verify.emailHeading') : undefined}
      destination={onEmailStage ? email : undefined}
      sentToLabel={onEmailStage ? t('kiosk.auth.common.sentToEmail') : undefined}
      wrongLabel={onEmailStage ? t('kiosk.auth.verify.wrongEmail') : undefined}
      subtitle={needsEmailCode ? t('kiosk.auth.verify.twoCodes') : undefined}
      onBack={backToDetails}
      onWrongNumber={backToDetails}
      onSubmit={async (code) => {
        if (onEmailStage) {
          return finish(smsCode, code)
        }
        if (needsEmailCode) {
          // Hold the SMS code and ask for the emailed one; nothing is sent until both
          // are in hand, because the server checks them in a single call.
          setSmsCode(code)
          return true
        }
        return finish(code)
      }}
      onResend={async () => {
        backToDetails()
        return false
      }}
    />
  )
}
