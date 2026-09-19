import { createBrowserRouter, Navigate } from 'react-router-dom'
import { sessionRoutes } from '../features/session/routes'
import { authRoutes } from '../features/auth/routes'
import { catalogueRoutes } from '../features/catalogue/routes'
import { symptomsRoutes } from '../features/symptoms/routes'

/**
 * Composition seam. Every feature owns its own `routes.tsx`, so adding screens never
 * means editing a shared array: it is one import line and one spread here.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/kiosk/attract" replace />,
  },
  ...sessionRoutes,
  ...authRoutes,
  ...catalogueRoutes,
  ...symptomsRoutes,
  {
    path: '*',
    element: <Navigate to="/kiosk/attract" replace />,
  },
])
