import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { SessionTimer } from './components/SessionTimer'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <SessionTimer />
    </>
  )
}
