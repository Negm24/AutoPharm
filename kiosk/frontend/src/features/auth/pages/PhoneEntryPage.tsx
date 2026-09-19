import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { digitsOnly } from '../../../shared/format/digits'
import { KeyboardSheet, KioskScreen, TextField } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import {
  DEFAULT_DIAL_CODE,
  MAX_TYPED_PHONE_DIGITS,
  MIN_JUDGEABLE_PHONE_DIGITS,
  QR_ENABLED,
} from '../constants'
import { AuthNotice } from '../components/AuthNotice'
import { GuestEscape } from '../components/GuestEscape'
import { formatNationalPhone, normalizeEgyptianPhone, type PhoneIssue } from '../validation'

const ISSUE_KEYS: Record<PhoneIssue, string> = {
  empty: 'kiosk.auth.errors.phoneEmpty',
  length: 'kiosk.auth.errors.phoneLength',
  prefix: 'kiosk.auth.errors.phonePrefix',
}

/**
 * FR-30: sign-in starts with the mobile number, typed on the on-screen numeric pad.
 * FR-30a: Egyptian national format in, canonical E.164 out.
 */
export default function PhoneEntryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setPhone = useAuthStore((state) => state.setPhone)
  const error = useAuthStore((state) => state.error)

  const [national, setNational] = useState('')
  const [issue, setIssue] = useState<PhoneIssue | null>(null)

  // One source of truth for "is this number usable": the same validator that mirrors the
  // backend. Gating the key on a raw digit count instead used to strand anyone who typed
  // their number without the leading zero, which the validator accepts.
  const parsed = normalizeEgyptianPhone(national)

  const submit = () => {
    if (!parsed.ok) {
      setIssue(parsed.issue)
      return
    }
    setIssue(null)
    setPhone(parsed.e164)
    navigate('/kiosk/auth/pin')
  }

  // FR-72: a disabled key must never be a dead end, so once there is enough to judge, the
  // reason it is disabled is on screen.
  const liveIssue =
    issue ?? (!parsed.ok && national.length >= MIN_JUDGEABLE_PHONE_DIGITS ? parsed.issue : null)

  return (
    <KioskScreen
      title={t('kiosk.auth.phone.screenTitle')}
      onBack={() => navigate('/kiosk/menu', { replace: true })}
      keyboard={
        <KeyboardSheet
          layout="num"
          doneDisabled={!parsed.ok}
          onKey={(value) => {
            setIssue(null)
            setNational((current) => digitsOnly(current + value, MAX_TYPED_PHONE_DIGITS))
          }}
          onBackspace={() => {
            setIssue(null)
            setNational((current) => current.slice(0, -1))
          }}
          onDone={submit}
        />
      }
    >
      <div className="flex h-full gap-10 px-12 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{t('kiosk.auth.phone.heading')}</h1>

          <TextField
            id="phone"
            label={t('kiosk.auth.phone.label')}
            value={formatNationalPhone(national)}
            placeholder={t('kiosk.auth.phone.placeholder')}
            active
            // The number itself is always read left to right, even in Arabic.
            dir="ltr"
            prefix={DEFAULT_DIAL_CODE}
            error={liveIssue ? t(ISSUE_KEYS[liveIssue]) : null}
            hint={t('kiosk.auth.phone.subtitle')}
            onFocus={() => undefined}
          />

          <AuthNotice error={error} />

          <div className="flex items-center gap-4 text-[15px]">
            <span className="text-text-muted">{t('kiosk.auth.phone.noAccount')}</span>
            <button
              type="button"
              onClick={() => navigate('/kiosk/auth/signup')}
              className="text-primary underline underline-offset-4"
            >
              {t('kiosk.auth.common.createAccount')}
            </button>
            {QR_ENABLED ? (
              <button
                type="button"
                onClick={() => navigate('/kiosk/auth/qr')}
                className="text-primary underline underline-offset-4"
              >
                {t('kiosk.auth.phone.qrCta')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex w-[300px] shrink-0 flex-col justify-center">
          <GuestEscape />
        </div>
      </div>
    </KioskScreen>
  )
}
