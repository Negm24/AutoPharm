import { createBrowserRouter, Navigate } from 'react-router-dom'
import KioskAttract from '../pages/KioskAttract'
import KioskLanguagePage from '../pages/KioskLanguagePage'
import KioskMenuPage from '../pages/KioskMenuPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="kiosk/attract" replace />,
  },
  {
    path: '/kiosk/attract',
    element: <KioskAttract />,
  },
  {
    path: '/kiosk/language',
    element: <KioskLanguagePage />,
  },
  {
    path: '/kiosk/menu',
    element: <KioskMenuPage />,
  },
])
