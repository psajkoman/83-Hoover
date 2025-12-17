'use client'

import { useEffect, useState } from 'react'
import { Clock, Clock3 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function Footer() {
  const { useServerTime, toggleTimezone, formatDateTime } = useTimezone()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [timezone, setTimezone] = useState<string>('Server Time')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(formatDateTime(now))
      
      // Update timezone label
      if (!useServerTime) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        setTimezone(`Local (${timeZone})`)
      } else {
        setTimezone('Server Time')
      }
    }

    // Update time immediately and then every second
    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [useServerTime, formatDateTime])

  const toggleTimeDisplay = () => {
    toggleTimezone()
  }

  // components/layout/Footer.tsx
  useEffect(() => {
    console.log('Timezone changed:', useServerTime ? 'Server Time' : 'Local Time')
  }, [useServerTime])
  return (
    <footer className="bg-gang-secondary/80 border-t border-gang-accent/30 py-4 px-4">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip content={`Switch to ${useServerTime ? 'Local' : 'Server'} Time`}>
            <button
              onClick={toggleTimeDisplay}
              className="p-2 rounded-md hover:bg-gang-accent/20 transition-colors text-gray-300 hover:text-white"
              aria-label="Toggle time display"
            >
              {useServerTime ? (
                <Clock3 className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </button>
          </Tooltip>
          <div className="flex flex-col">
            <div className="text-sm text-gray-300">
              {timezone}
            </div>
            <div className="text-sm text-gray-400">
              {currentTime || 'Loading time...'}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-400">
          © {new Date().getFullYear()} Low West Crew. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
