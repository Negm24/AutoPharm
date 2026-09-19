import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { RequireSession, RequireStep } from './components/guards'
import { installKioskSessionBridge } from './kioskSessionBridge'
import AccountPage from './pages/AccountPage'
import AuthUnavailablePage from './pages/AuthUnavailablePage'
import LockedOutPage from './pages/LockedOutPage'
import NewPinPage from './pages/NewPinPage'
import PhoneEntryPage from './pages/PhoneEntryPage'
import PinEntryPage from './pages/PinEntryPage'
import PrescriptionGatePage from './pages/PrescriptionGatePage'
import QrSignInPage from './pages/QrSignInPage'
import ResetCodePage from './pages/ResetCodePage'
import SignupDetailsPage from './pages/SignupDetailsPage'
import SignupVerifyPage from './pages/SignupVerifyPage'

// Installed here, at import time, so the server-side kiosk session is mirrored before any
// auth screen can render. Nothing in Feature 1 has to know this exists.
installKioskSessionBridge()

/** Feature 4 — Customer Authorization. Owner: FE Member 3. */
export const authRoutes: RouteObject[] = [
  {
    path: '/kiosk/auth',
    element: <Navigate to="/kiosk/auth/phone" replace />,
  },
  {
    path: '/kiosk/auth/gate',
    element: (
      <RequireSession>
        <PrescriptionGatePage />
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/phone',
    element: (
      <RequireSession>
        <RequireStep step="phone">
          <PhoneEntryPage />
        </RequireStep>
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/pin',
    element: (
      <RequireSession>
        <RequireStep step="pin">
          <PinEntryPage />
        </RequireStep>
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/signup',
    element: (
      <RequireSession>
        <SignupDetailsPage />
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/signup/verify',
    element: (
      <RequireSession>
        <RequireStep step="signup_verify">
          <SignupVerifyPage />
        </RequireStep>
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/reset/verify',
    element: (
      <RequireSession>
        <RequireStep step="reset_verify">
          <ResetCodePage />
        </RequireStep>
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/reset/pin',
    element: (
      <RequireSession>
        <RequireStep step="reset_pin">
          <NewPinPage />
        </RequireStep>
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/locked',
    element: (
      <RequireSession>
        <LockedOutPage />
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/unavailable',
    element: (
      <RequireSession>
        <AuthUnavailablePage />
      </RequireSession>
    ),
  },
  {
    path: '/kiosk/auth/qr',
    element: (
      <RequireSession>
        <QrSignInPage />
      </RequireSession>
    ),
  },
  {
    // Reachable as a guest too: it is the "who is signed in here" screen, and FR-35 wants
    // sign-out available at any time.
    path: '/kiosk/account',
    element: (
      <RequireSession>
        <AccountPage />
      </RequireSession>
    ),
  },
]
