import { useEffect } from 'react'
import { useSessionStore } from '../sessionStore'

export function SessionTimer() {
  const startSession = useSessionStore((state) => state.startSession)

  useEffect(() => {
    startSession()
  }, [startSession])

  return null
}
