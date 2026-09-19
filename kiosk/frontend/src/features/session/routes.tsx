import type { RouteObject } from 'react-router-dom'
import KioskAttract from './pages/KioskAttract'
import KioskLanguagePage from './pages/KioskLanguagePage'
import KioskMenuPage from './pages/KioskMenuPage'

/** Feature 1 — Session, Language and Shell. Owner: Boda. */
export const sessionRoutes: RouteObject[] = [
  { path: '/kiosk/attract', element: <KioskAttract /> },
  { path: '/kiosk/language', element: <KioskLanguagePage /> },
  { path: '/kiosk/menu', element: <KioskMenuPage /> },
]
