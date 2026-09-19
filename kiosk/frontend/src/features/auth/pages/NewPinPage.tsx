import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { digitsOnly } from '../../../shared/format/digits'
import { DigitBoxes, KeyboardSheet, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { PIN_LENGTH } from '../constants'
import { AuthNotice } from '../components/AuthNotice'
import { GuestEscape } from '../components/GuestEscape'
import { validatePin } from '../validation'

/**
 * FR-32, steps 5 to 7: set a new PIN, confirm it, and end up signed in.
 *
 * Both entries stay in component state and are wiped on unmount and after every submit.
 * The policy check here is only to save a round trip — `security/policy.py` runs the same
 * rules server-side and its message is what gets shown if the two ever disagree.
 */
export default function NewPinPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const confirmPinReset = useAuthStore((state) => state.confirmPinReset)
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const returnTo = useAuthStore((state) => state.returnTo)

  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [issue, setIssue] = useState<string | null>(null)

  const stage: 'choose' | 'confirm' = pin.length === PIN_LENGTH ? 'confirm' : 'choose'
  const value = stage === 'choose' ? pin : confirmation
  const busy = status === 'submitting'

  useEffect(
    () => () => {
      setPin('')
      setConfirmation('')
    },
    [],
  )

  const submit = async (candidate: string) => {
    if (candidate !== pin) {
      setIssue(t('kiosk.auth.reset.confirmMismatch'))
      setConfirmation('')
      return
    }
    try {
      if (await confirmPinReset(candidate)) {
        navigate(returnTo, { replace: true })
      }
    } finally {
      setPin('')
      setConfirmation('')
    }
  }

  const append = (digit: string) => {
    if (busy) {
      return
    }
    setIssue(null)
    if (stage === 'choose') {
      const next = digitsOnly(pin + digit, PIN_LENGTH)
      setPin(next)
      if (next.length === PIN_LENGTH) {
        const policyIssue = validatePin(next)
        if (policyIssue) {
          setIssue(
            t(policyIssue === 'length' ? 'kiosk.auth.errors.pinLength' : 'kiosk.auth.errors.pinWeak'),
          )
          setPin('')
        }
      }
      return
    }

    const next = digitsOnly(confirmation + digit, PIN_LENGTH)
    setConfirmation(next)
    if (next.length === PIN_LENGTH) {
      void submit(next)
    }
  }

  const backspace = () => {
    setIssue(null)
    if (stage === 'choose') {
      setPin((current) => current.slice(0, -1))
    } else {
      setConfirmation((current) => current.slice(0, -1))
    }
  }

  return (
    <KioskScreen
      title={t('kiosk.auth.reset.screenTitle')}
      onBack={() => navigate('/kiosk/auth/reset/verify', { replace: true })}
      keyboard={
        <KeyboardSheet
          layout="num"
          doneDisabled={value.length !== PIN_LENGTH}
          onKey={append}
          onBackspace={backspace}
          onDone={() => stage === 'confirm' && void submit(confirmation)}
        />
      }
    >
      <div className="flex h-full gap-10 px-12 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight">
            {t('kiosk.auth.reset.newPinHeading')}
          </h1>
          <p className="text-lg text-text-secondary">
            {stage === 'choose'
              ? t('kiosk.auth.reset.newPinLabel')
              : t('kiosk.auth.reset.confirmLabel')}
          </p>

          <DigitBoxes
            length={PIN_LENGTH}
            value={value}
            masked
            invalid={Boolean(issue)}
            label={t('kiosk.auth.a11y.pinEntry')}
          />

          {issue ? <p className="text-[15px] text-emergency">{issue}</p> : null}
        </div>

        <div className="flex w-[300px] shrink-0 flex-col justify-center gap-4">
          <AuthNotice error={error} />
          <GuestEscape />
        </div>
      </div>
    </KioskScreen>
  )
}
