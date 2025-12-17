'use client'

import { useState, useEffect } from 'react'

export default function ServerClock() {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }
      setCurrentTime(now.toLocaleString('en-US', options))
    }

    // Update time immediately and then every second
    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="hidden md:flex items-center px-3 py-1.5 text-xs text-gray-300 bg-gang-secondary/30 rounded-md border border-gang-accent/20 whitespace-nowrap">
      {currentTime || '...'}
    </div>
  )
}
