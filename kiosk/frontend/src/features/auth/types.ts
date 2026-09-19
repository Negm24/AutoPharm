/** `kiosk/me/` (UserSerializer). Names are Latin-script only, enforced server-side. */
export interface Customer {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  phoneCountryCode: string
  dateOfBirth: string
  email: string | null
}

/** The shape every successful credential exchange returns. */
export interface AuthSuccess {
  accessToken: string
  expiresIn: number
  userId: string
}

/** `kiosk/sessions/start/`. `userId` is null for a guest, which is the default. */
export interface KioskServerSession {
  id: string
  terminalId: string
  userId: string | null
  locale: 'en' | 'ar'
  deadline: number
  expiresIn: number
}

/** `kiosk/sessions/extend/`: always extends, and renews the token when signed in. */
export interface SessionExtended {
  expiresIn: number
  access: AuthSuccess | null
}

export type ChallengeKind = 'signup' | 'reset'

export interface SignupDraft {
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  phoneCountryCode: string
}
