import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { SessionTimer } from './features/session/components/SessionTimer'
import { MockOtpBanner } from './features/auth/components/MockOtpBanner'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <SessionTimer />
      {/* Renders nothing outside development. */}
      <MockOtpBanner />
    </>
  )
}
