'use client'

import { createContext, useContext, useState, ReactNode, useMemo } from 'react'

type TimezoneContextType = {
  useServerTime: boolean
  use24HourFormat: boolean
  toggleTimezone: () => void
  toggleTimeFormat: () => void
  getCurrentTime: () => Date
  formatTime: (date: Date | string) => string
  formatDateTime: (date: Date | string) => string
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

const TIMEZONE_PREFERENCE_KEY = 'timezonePreference'
const TIME_FORMAT_KEY = 'timeFormatPreference'

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [useServerTime, setUseServerTime] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(TIMEZONE_PREFERENCE_KEY)
    return saved ? JSON.parse(saved) : true
  })

  const [use24HourFormat, setUse24HourFormat] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem(TIME_FORMAT_KEY)
    return saved ? JSON.parse(saved) : false
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
  const toggleTimeFormat = () => {
    setUse24HourFormat(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem(TIME_FORMAT_KEY, JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const formatTime = useMemo(() => {
    return (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : new Date(date)
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24HourFormat,
        timeZone: useServerTime ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, [useServerTime, use24HourFormat])

  const formatDateTime = useMemo(() => {
    return (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : new Date(date)
      return d.toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24HourFormat,
        timeZone: useServerTime ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, [useServerTime, use24HourFormat])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    useServerTime,
    use24HourFormat,
    toggleTimezone,
    toggleTimeFormat,
    getCurrentTime,
    formatTime,
    formatDateTime
  }), [useServerTime, use24HourFormat, formatTime, formatDateTime, toggleTimezone])

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
