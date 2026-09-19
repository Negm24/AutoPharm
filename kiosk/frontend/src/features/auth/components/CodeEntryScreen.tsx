import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { digitsOnly } from '../../../shared/format/digits'
import { useCountdown } from '../../../shared/hooks'
import { Alert, Button, DigitBoxes, KeyboardSheet, KioskScreen } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { OTP_LENGTH } from '../constants'
import { AuthNotice } from './AuthNotice'
import { GuestEscape } from './GuestEscape'

interface CodeEntryScreenProps {
  title: string
  subtitle?: string
  onBack: () => void
  onWrongNumber: () => void
  onSubmit: (code: string) => Promise<boolean>
  onResend: () => Promise<boolean>
}

/**
 * Mockup screen L, shared by sign-up verification and PIN reset: six boxes, a resend
 * timer and an explicit wrong-code state.
 *
 * The backend burns an attempt on every wrong or malformed entry and deletes the
 * challenge on the fifth, so once `dead` is set the only way forward is a new code
 * (FR-32a). The resend button stays locked for 30 seconds because the server rate-limits
 * SMS to one per 30 seconds per number and would answer 429 anyway.
 */
export function CodeEntryScreen({
  title,
  subtitle,
  onBack,
  onWrongNumber,
  onSubmit,
  onResend,
}: CodeEntryScreenProps) {
  const { t } = useTranslation()
  const challenge = useAuthStore((state) => state.challenge)
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)

  const [code, setCode] = useState('')
  const resend = useCountdown(challenge?.resendAvailableAt ?? null)
  const expiry = useCountdown(challenge?.expiresAt ?? null)

  const busy = status === 'submitting'
  const dead = challenge?.dead ?? false
  const expired = expiry.isDone
  const blocked = dead || expired

  useEffect(() => () => setCode(''), [])

  const submit = async (candidate: string) => {
    if (candidate.length !== OTP_LENGTH || blocked) {
      return
    }
    if (!(await onSubmit(candidate))) {
      setCode('')
    }
  }

  const append = (value: string) => {
    if (busy || blocked) {
      return
    }
    const next = digitsOnly(code + value, OTP_LENGTH)
    setCode(next)
    if (next.length === OTP_LENGTH) {
      void submit(next)
    }
  }

  return (
    <KioskScreen
      title={title}
      onBack={onBack}
      keyboard={
        <KeyboardSheet
          layout="num"
          doneDisabled={code.length !== OTP_LENGTH || blocked}
          onKey={append}
          onBackspace={() => setCode((current) => current.slice(0, -1))}
          onDone={() => void submit(code)}
        />
      }
    >
      <div className="flex h-full gap-10 px-12 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{t('kiosk.auth.verify.heading')}</h1>

          <div className="flex items-center gap-3 text-lg text-text-secondary">
            <span>{t('kiosk.auth.common.sentTo')}</span>
            <bdi dir="ltr">{challenge?.phone.masked}</bdi>
            <span aria-hidden="true">{'·'}</span>
            <button
              type="button"
              onClick={onWrongNumber}
              className="text-primary underline underline-offset-4"
            >
              {t('kiosk.auth.verify.wrongNumber')}
            </button>
          </div>

          <DigitBoxes
            length={OTP_LENGTH}
            value={code}
            size="code"
            invalid={error?.code === 'invalid_code'}
            label={t('kiosk.auth.a11y.codeEntry')}
          />

          {subtitle ? <p className="text-[15px] text-text-muted">{subtitle}</p> : null}
          {!blocked ? (
            <p className="text-[15px] text-text-muted">
              {t('kiosk.auth.verify.expiresIn', { time: expiry.label })}
            </p>
          ) : null}
        </div>

        <div className="flex w-[300px] shrink-0 flex-col justify-center gap-4">
          {dead ? (
            <Alert tone="warning">{t('kiosk.auth.verify.dead')}</Alert>
          ) : expired ? (
            <Alert tone="warning">{t('kiosk.auth.verify.expired')}</Alert>
          ) : (
            <AuthNotice error={error} />
          )}

          <Button
            variant="secondary"
            size="secondary"
            block
            busy={busy}
            disabled={!resend.isDone}
            reason={!resend.isDone ? t('kiosk.auth.verify.resendIn', { time: resend.label }) : undefined}
            onClick={() => {
              setCode('')
              void onResend()
            }}
          >
            {t('kiosk.auth.verify.resend')}
          </Button>

          <GuestEscape />
        </div>
      </div>
    </KioskScreen>
  )
}
