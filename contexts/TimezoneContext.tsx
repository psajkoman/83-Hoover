'use client'

import { createContext, useContext, useState, ReactNode, useMemo } from 'react'

type TimezoneContextType = {
  useServerTime: boolean
  toggleTimezone: () => void
  getCurrentTime: () => Date
  formatTime: (date: Date | string) => string
  formatDateTime: (date: Date | string) => string
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

const TIMEZONE_PREFERENCE_KEY = 'timezonePreference'

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [useServerTime, setUseServerTime] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(TIMEZONE_PREFERENCE_KEY)
    return saved ? JSON.parse(saved) : true
  })

  const toggleTimezone = () => {
    setUseServerTime(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem(TIMEZONE_PREFERENCE_KEY, JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const getCurrentTime = useMemo(() => {
    return () => {
      const now = new Date()
      if (useServerTime) {
        return new Date(now.toISOString())
      }
      return now
    }
  }, [useServerTime])

  // contexts/TimezoneContext.tsx
  const formatTime = useMemo(() => {
    return (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : new Date(date)
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: useServerTime ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, [useServerTime])

  const formatDateTime = useMemo(() => {
    return (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : new Date(date)
      return d.toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: useServerTime ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, [useServerTime])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    useServerTime,
    toggleTimezone,
    getCurrentTime,
    formatTime,
    formatDateTime
  }), [useServerTime, formatTime, formatDateTime])

  return (
    <TimezoneContext.Provider value={contextValue}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  const context = useContext(TimezoneContext)
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}
