import { create } from 'zustand'

export type SessionStatus = 'attracting' | 'active' | 'warning' | 'expired' | 'ended'

export interface KioskSession {
  sessionId: string
  startedAt: number
  expiresAt: number
  status: SessionStatus
  lang: 'en' | 'ar'
}

interface SessionState {
  session: KioskSession | null
  currentRemaining: number
  endSession: () => void
  startSession: (lang?: 'en' | 'ar') => void
}

export const useSessionStore = create<SessionState>((set, get) => {
  let intervalId: ReturnType<typeof setInterval> | null = null

  const clearIntervalSafe = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const sessionExpired = () => {
    clearIntervalSafe()
    set({ session: null, currentRemaining: 0 })
    window.location.href = '/kiosk/attract'
  }

  return {
    session: null,
    currentRemaining: 10 * 60 * 1000,
    endSession: () => {
      clearIntervalSafe()
      set({ session: null, currentRemaining: 0 })
    },
    startSession: (lang?: 'en' | 'ar') => {
      clearIntervalSafe()

      const actualLang = lang || 'en'
      const now = Date.now()
      const duration = 10 * 60 * 1000
      const expiresAt = now + duration
      set({
        session: {
          sessionId: Math.random().toString(36).slice(2),
          startedAt: now,
          expiresAt,
          status: 'active',
          lang: actualLang,
        },
        currentRemaining: duration,
      })

      intervalId = setInterval(() => {
        const state = get()
        if (!state.session) {
          clearIntervalSafe()
          return
        }
        const remaining = Math.max(0, state.session.expiresAt - Date.now())
        set({ currentRemaining: remaining })
        if (remaining <= 0) {
          sessionExpired()
        }
      }, 1000)
    },
  }
})
