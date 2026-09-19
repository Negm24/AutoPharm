type Listener = (phone: string, code: string) => void

const listeners = new Set<Listener>()

/**
 * Development only. The real backend hands the code to `SimulatedSMS`, which stores it
 * encrypted in Redis where the browser cannot read it. The mock gateway publishes here
 * instead so a developer can finish the flow, and a DEV-only banner renders it.
 *
 * Never log a code: SEC-5 forbids codes in logs, analytics and crash reports.
 */
export const mockOtpChannel = {
  publish(phone: string, code: string) {
    for (const listener of listeners) {
      listener(phone, code)
    }
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
