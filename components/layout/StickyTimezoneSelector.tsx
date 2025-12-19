'use client'

import { useEffect, useState } from 'react'
import { Clock, Clock3 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function StickyTimezoneSelector() {
  const { useServerTime, toggleTimezone } = useTimezone()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer')
      if (footer) {
        const footerPosition = footer.getBoundingClientRect().top
        const isFooterInView = footerPosition <= window.innerHeight
        setIsVisible(!isFooterInView)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleToggle = () => {
    toggleTimezone()
  }

  if (!isVisible) return null

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Tooltip 
        content={
          useServerTime 
            ? `Server Time (UTC) - ${new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}`
            : `Local Time (${localTimeZone}) - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        } 
        position="left"
      >
        <button
          onClick={handleToggle}
          className={`p-3 rounded-full backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105 ${
            useServerTime 
              ? 'bg-blue-600/90 border-blue-400/50 hover:bg-blue-700/90' 
              : 'bg-amber-600/90 border-amber-400/50 hover:bg-amber-700/90'
          } border`}
          aria-label={useServerTime ? "Switch to Local Time" : "Switch to Server Time"}
        >
          {useServerTime ? (
            <div className="flex flex-col items-center">
              <Clock3 className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/80 mt-1">Server</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/80 mt-1">Local</span>
            </div>
          )}
        </button>
      </Tooltip>
    </div>
  )
}
