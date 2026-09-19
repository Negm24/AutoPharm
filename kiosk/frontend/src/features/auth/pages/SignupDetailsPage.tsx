import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { digitsOnly } from '../../../shared/format/digits'
import { Button, KeyboardSheet, KioskScreen, TextField } from '../../../shared/ui'
import type { KeyboardLayout } from '../../../shared/ui'
import { useAuthStore } from '../authStore'
import { DEFAULT_COUNTRY, DEFAULT_DIAL_CODE, PIN_LENGTH } from '../constants'
import { AuthNotice } from '../components/AuthNotice'
import { GuestEscape } from '../components/GuestEscape'
import {
  formatDateOfBirth,
  formatNationalPhone,
  normalizeEgyptianPhone,
  parseDateOfBirth,
  validateEmail,
  validateName,
  validatePin,
} from '../validation'

type FieldName = 'firstName' | 'lastName' | 'phone' | 'dob' | 'pin' | 'email'

const LAYOUTS: Record<FieldName, KeyboardLayout> = {
  firstName: 'en',
  lastName: 'en',
  phone: 'num',
  dob: 'num',
  pin: 'num',
  email: 'en',
}

const MAX_DIGITS: Partial<Record<FieldName, number>> = {
  phone: 11,
  dob: 8,
  pin: PIN_LENGTH,
}

/**
 * Mockup screen K, with one addition the mockup does not show: date of birth.
 *
 * `ProfileSerializer` requires `date_of_birth`, so a four-field form would fail
 * server-side every time. The backend is read-only here, so the form asks for it, in a
 * compact numeric row that costs a few seconds of FR-31's two-minute budget.
 *
 * The keyboard is only mounted while a field is focused. With it up the content area is
 * 244px, which fits the fields but not the side panel, so the panel and the actions show
 * when the keyboard is down — the design's "keyboard covers none of them" requirement.
 */
export default function SignupDetailsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const setSignupDraft = useAuthStore((state) => state.setSignupDraft)
  const requestSignup = useAuthStore((state) => state.requestSignup)
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)

  const draft = useAuthStore((state) => state.signupDraft)

  // Coming back from the verification screen to resend restores everything except the
  // PIN, which is never kept anywhere in the frontend and has to be chosen again.
  const [values, setValues] = useState<Record<FieldName, string>>(() => ({
    firstName: draft?.firstName ?? '',
    lastName: draft?.lastName ?? '',
    phone: draft ? normalizeEgyptianPhone(draft.phoneNumber).national : '',
    dob: draft ? draft.dateOfBirth.split('-').reverse().join('') : '',
    pin: '',
    email: draft?.email ?? '',
  }))
  const [active, setActive] = useState<FieldName | null>(null)
  const [issues, setIssues] = useState<Partial<Record<FieldName, string>>>({})

  // The PIN is part of this form, so wipe the whole draft when the screen goes away.
  useEffect(
    () => () =>
      setValues({ firstName: '', lastName: '', phone: '', dob: '', pin: '', email: '' }),
    [],
  )

  const update = (field: FieldName, next: string) => {
    const limit = MAX_DIGITS[field]
    setValues((current) => ({
      ...current,
      [field]: limit ? digitsOnly(next, limit) : next.slice(0, 254),
    }))
    setIssues((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const next: Partial<Record<FieldName, string>> = {}

    const firstIssue = validateName(values.firstName)
    if (firstIssue) {
      next.firstName = t(
        firstIssue === 'required' ? 'kiosk.auth.errors.nameRequired' : 'kiosk.auth.errors.nameLatinOnly',
      )
    }
    const lastIssue = validateName(values.lastName)
    if (lastIssue) {
      next.lastName = t(
        lastIssue === 'required' ? 'kiosk.auth.errors.nameRequired' : 'kiosk.auth.errors.nameLatinOnly',
      )
    }

    const phone = normalizeEgyptianPhone(values.phone)
    if (!phone.ok) {
      next.phone = t(
        phone.issue === 'prefix'
          ? 'kiosk.auth.errors.phonePrefix'
          : phone.issue === 'empty'
            ? 'kiosk.auth.errors.phoneEmpty'
            : 'kiosk.auth.errors.phoneLength',
      )
    }

    const dob = parseDateOfBirth(values.dob)
    if (dob.issue) {
      next.dob = t(
        dob.issue === 'required'
          ? 'kiosk.auth.errors.dobRequired'
          : dob.issue === 'future'
            ? 'kiosk.auth.errors.dobFuture'
            : 'kiosk.auth.errors.dobInvalid',
      )
    }

    const pinIssue = validatePin(values.pin)
    if (pinIssue) {
      next.pin = t(pinIssue === 'length' ? 'kiosk.auth.errors.pinLength' : 'kiosk.auth.errors.pinWeak')
    }

    if (validateEmail(values.email)) {
      next.email = t('kiosk.auth.errors.emailInvalid')
    }

    setIssues(next)
    return Object.keys(next).length === 0 ? { phone: phone.e164, dob: dob.iso } : null
  }

  const submit = async () => {
    const checked = validate()
    if (!checked) {
      return
    }
    setSignupDraft({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dateOfBirth: checked.dob,
      email: values.email.trim(),
      phoneNumber: checked.phone,
      phoneCountryCode: DEFAULT_COUNTRY,
    })
    if (await requestSignup(values.pin)) {
      navigate('/kiosk/auth/signup/verify')
    }
  }

  const field = (name: FieldName, label: string, extra: Record<string, unknown> = {}) => (
    <TextField
      id={name}
      label={label}
      value={
        name === 'phone'
          ? formatNationalPhone(values.phone)
          : name === 'dob'
            ? formatDateOfBirth(values.dob)
            : name === 'pin'
              ? '•'.repeat(values.pin.length)
              : values[name]
      }
      active={active === name}
      error={issues[name] ?? null}
      onFocus={() => setActive(name)}
      {...extra}
    />
  )

  return (
    <KioskScreen
      title={t('kiosk.auth.common.step', { current: 1, total: 2 })}
      onBack={() => navigate('/kiosk/auth/phone', { replace: true })}
      keyboard={
        active ? (
          <KeyboardSheet
            layout={LAYOUTS[active]}
            onKey={(value) => update(active, values[active] + value)}
            onBackspace={() => update(active, values[active].slice(0, -1))}
            onDone={() => setActive(null)}
          />
        ) : undefined
      }
    >
      <div className="flex h-full gap-8 px-12 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {!active ? (
            <h1 className="text-2xl font-medium tracking-tight">{t('kiosk.auth.signup.heading')}</h1>
          ) : null}

          <div className="grid grid-cols-3 gap-x-5 gap-y-3">
            {field('firstName', t('kiosk.auth.signup.firstNameLabel'), {
              placeholder: t('kiosk.auth.signup.namePlaceholder'),
              dir: 'ltr',
            })}
            {field('lastName', t('kiosk.auth.signup.lastNameLabel'), {
              placeholder: t('kiosk.auth.signup.lastNamePlaceholder'),
              dir: 'ltr',
            })}
            {field('phone', t('kiosk.auth.signup.phoneLabel'), {
              prefix: DEFAULT_DIAL_CODE,
              placeholder: t('kiosk.auth.phone.placeholder'),
              dir: 'ltr',
            })}
            {field('dob', t('kiosk.auth.signup.dobLabel'), {
              placeholder: `${t('kiosk.auth.signup.dobDay')} / ${t('kiosk.auth.signup.dobMonth')} / ${t('kiosk.auth.signup.dobYear')}`,
              dir: 'ltr',
            })}
            {field('pin', t('kiosk.auth.signup.pinLabel'), { placeholder: '— — — —' })}
            {field('email', t('kiosk.auth.signup.emailLabel'), {
              placeholder: t('kiosk.auth.signup.emailPlaceholder'),
              hint: t('kiosk.auth.signup.emailOptional'),
              dir: 'ltr',
            })}
          </div>

          {!active ? (
            <>
              <AuthNotice error={error} />
              <p className="text-[15px] text-text-muted">{t('kiosk.auth.signup.nameLatinHint')}</p>
            </>
          ) : null}
        </div>

        {!active ? (
          <aside className="flex w-[300px] shrink-0 flex-col justify-between gap-4">
            <div className="rounded-xl border border-border bg-surface-sunken p-4">
              <div className="font-mono text-[13px] tracking-widest text-text-muted">
                {t('kiosk.auth.signup.whyTitle')}
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                {t('kiosk.auth.signup.whyBody')}
              </p>
            </div>

            <Button block busy={status === 'submitting'} onClick={() => void submit()}>
              {t('kiosk.auth.signup.submit')}
            </Button>

            <GuestEscape />
            <p className="text-[15px] leading-snug text-text-muted">{t('kiosk.auth.common.legal')}</p>
          </aside>
        ) : null}
      </div>
    </KioskScreen>
  )
}
