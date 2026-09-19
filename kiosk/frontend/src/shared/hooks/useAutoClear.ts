import { useCallback, useEffect, useState } from 'react'

/**
 * PRV-7: a screen showing personal or prescription data clears itself on a short timer
 * that is independent of the main session timeout. The design states the value out loud:
 * "Prescription details are shown on screen for 90 seconds, then cleared."
 *
 * Any touch inside the guarded area restarts the timer.
 */
export function useAutoClear(delayMs: number, enabled = true) {
  const [hidden, setHidden] = useState(false)
  const [restartedAt, setRestartedAt] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled || hidden) {
      return
    }
    const id = setTimeout(() => setHidden(true), delayMs)
    return () => clearTimeout(id)
  }, [delayMs, enabled, hidden, restartedAt])

  const keepAlive = useCallback(() => {
    if (!hidden) {
      setRestartedAt(Date.now())
    }
  }, [hidden])

  const reveal = useCallback(() => {
    setHidden(false)
    setRestartedAt(Date.now())
  }, [])

  return { hidden, keepAlive, reveal }
}
