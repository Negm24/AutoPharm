import { useEffect, useState } from 'react'
import { formatDuration } from '../format/duration'

export interface Countdown {
  remainingMs: number
  /** M:SS, the format the kiosk chrome uses everywhere. */
  label: string
  isDone: boolean
}

/**
 * Ticks once a second towards an absolute timestamp, then stops.
 *
 * Every countdown on the kiosk goes through here — the resend cooldown, the code expiry
 * and the lockout timer — so they cannot drift apart or leave a stray interval running.
 * Pass null to disable.
 */
export function useCountdown(targetMs: number | null): Countdown {
  const [now, setNow] = useState(() => Date.now())
  const [trackedTarget, setTrackedTarget] = useState(targetMs)

  // Resyncing during render rather than in an effect: a new target with a stale `now`
  // would show a wrong remaining time for one frame. This is React's documented
  // "adjusting state when a prop changes" pattern, and reading the clock is the whole
  // point of a countdown, so the purity rule is suppressed here deliberately.
  if (targetMs !== trackedTarget) {
    setTrackedTarget(targetMs)
    // oxlint-disable-next-line react/purity
    setNow(Date.now())
  }

  useEffect(() => {
    if (targetMs === null || targetMs <= Date.now()) {
      return
    }
    const id = setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick >= targetMs) {
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  if (targetMs === null) {
    return { remainingMs: 0, label: formatDuration(0), isDone: true }
  }

  const remainingMs = Math.max(0, targetMs - now)
  return { remainingMs, label: formatDuration(remainingMs), isDone: remainingMs <= 0 }
}
