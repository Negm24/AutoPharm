import { useEffect, useState } from 'react'
import { mockOtpChannel } from '../gateway/mockOtpChannel'

/**
 * Development affordance. The mock gateway has no SMS gateway to deliver a code through,
 * and the real backend encrypts it into Redis where the browser cannot reach it, so this
 * shows the code the mock just issued.
 *
 * It renders nothing outside `import.meta.env.DEV`, and the code is never written to the
 * console: SEC-5 keeps verification codes out of logs, analytics and crash reports.
 */
export function MockOtpBanner() {
  const [latest, setLatest] = useState<{ phone: string; code: string } | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }
    return mockOtpChannel.subscribe((phone, code) => setLatest({ phone, code }))
  }, [])

  if (!import.meta.env.DEV || !latest) {
    return null
  }

  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-lg bg-black/80 px-3 py-2 font-mono text-[13px] text-white"
    >
      dev sms {latest.phone} {'→'} <strong className="text-base">{latest.code}</strong>
    </div>
  )
}
