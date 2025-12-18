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
    <footer className="bg-gang-secondary/80 border-t border-gang-accent/30 py-3 sm:py-4 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 min-h-[4rem] sm:min-h-16">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <Tooltip content={`Switch to ${useServerTime ? 'Local' : 'Server'} Time`}>
              <button
                onClick={toggleTimeDisplay}
                className="p-1.5 sm:p-2 rounded-md hover:bg-gang-accent/20 transition-colors text-gray-300 hover:text-white"
                aria-label="Toggle time display"
              >
                {useServerTime ? (
                  <Clock3 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </Tooltip>
            <div className="flex flex-col items-start sm:items-start text-center sm:text-left">
              <div className="text-xs sm:text-sm text-gray-300 font-medium">
                {timezone}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                {currentTime || 'Loading time...'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-right w-full sm:w-auto mt-1 sm:mt-0">
          © {new Date().getFullYear()} Low West Crew. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
