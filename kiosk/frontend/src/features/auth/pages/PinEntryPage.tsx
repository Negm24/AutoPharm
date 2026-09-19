import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { digitsOnly } from '../../../shared/format/digits'
import { DigitBoxes, KeyboardSheet, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { LOCKOUT_THRESHOLD, PIN_LENGTH } from '../constants'
import { AuthNotice } from '../components/AuthNotice'
import { GuestEscape } from '../components/GuestEscape'

/**
 * Mockup screen J: phone already known, PIN typed on the numeric pad, masked.
 *
 * The PIN lives in this component's state and nowhere else — not in the store, not in a
 * ref that outlives the screen. It is wiped after every submit and again on unmount, so
 * SEC-3 ("never on the terminal") holds even if someone walks away mid-entry.
 */
export default function PinEntryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const phone = useAuthStore((state) => state.phone)
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const pinFailures = useAuthStore((state) => state.pinFailures)
  const submitPin = useAuthStore((state) => state.submitPin)
  const requestPinReset = useAuthStore((state) => state.requestPinReset)
  const clearPhone = useAuthStore((state) => state.clearPhone)
  const returnTo = useAuthStore((state) => state.returnTo)

  const [pin, setPin] = useState('')
  const busy = status === 'submitting'

  useEffect(() => () => setPin(''), [])

  const submit = async (candidate: string) => {
    try {
      if (await submitPin(candidate)) {
        navigate(returnTo, { replace: true })
      }
    } finally {
      // Whether it worked or not, the digits do not stay on screen.
      setPin('')
    }
  }

  const append = (value: string) => {
    if (busy) {
      return
    }
    const next = digitsOnly(pin + value, PIN_LENGTH)
    setPin(next)
    if (next.length === PIN_LENGTH) {
      void submit(next)
    }
  }

  const forgot = async () => {
    if (await requestPinReset()) {
      navigate('/kiosk/auth/reset/verify')
    }
  }

  const triesLeft = Math.max(0, LOCKOUT_THRESHOLD - pinFailures)

  return (
    <KioskScreen
      title={t('kiosk.auth.pin.screenTitle')}
      onBack={() => {
        clearPhone()
        navigate('/kiosk/auth/phone', { replace: true })
      }}
      keyboard={
        <KeyboardSheet
          layout="num"
          doneDisabled={pin.length !== PIN_LENGTH}
          onKey={append}
          onBackspace={() => setPin((current) => current.slice(0, -1))}
          onDone={() => void submit(pin)}
        />
      }
    >
      <div className="flex h-full gap-10 px-12 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{t('kiosk.auth.pin.heading')}</h1>

          <div className="flex items-center gap-3 text-lg text-text-secondary">
            {/* bdi keeps the number as one left-to-right run inside Arabic text. */}
            <bdi dir="ltr">{phone?.masked}</bdi>
            <span aria-hidden="true">{'·'}</span>
            <button
              type="button"
              onClick={() => {
                clearPhone()
                navigate('/kiosk/auth/phone', { replace: true })
              }}
              className="text-primary underline underline-offset-4"
            >
              {t('kiosk.auth.common.changeNumber')}
            </button>
          </div>

          <DigitBoxes
            length={PIN_LENGTH}
            value={pin}
            masked
            invalid={error?.code === 'invalid_credentials'}
            label={t('kiosk.auth.a11y.pinEntry')}
          />

          <div className="text-[15px] text-text-muted">
            {t('kiosk.auth.pin.forgotPrefix')}
            <button
              type="button"
              onClick={() => void forgot()}
              className="text-primary underline underline-offset-4"
            >
              {t('kiosk.auth.pin.forgotLink')}
            </button>
            {t('kiosk.auth.pin.forgotSuffix')}
          </div>
        </div>

        <div className="flex w-[300px] shrink-0 flex-col justify-center gap-4">
          <AuthNotice error={error} />
          {pinFailures > 0 && triesLeft > 0 ? (
            <p className="text-[15px] text-text-secondary">
              {t('kiosk.auth.pin.triesLeft', { count: triesLeft })}
            </p>
          ) : null}
          <GuestEscape />
        </div>
      </div>
    </KioskScreen>
  )
}
