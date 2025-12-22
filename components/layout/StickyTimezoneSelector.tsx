'use client'

import { useEffect, useState } from 'react'
import { Clock, Clock3, Clock9, Clock12 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function StickyTimezoneSelector() {
  const { 
    useServerTime, 
    use24HourFormat, 
    toggleTimezone, 
    toggleTimeFormat 
  } = useTimezone()
  const [isVisible, setIsVisible] = useState(false)
  const [isScrollingUp, setIsScrollingUp] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showBoth, setShowBoth] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const isScrollingUpNow = currentScrollY < lastScrollY
      
      // Update scroll direction
      setIsScrollingUp(isScrollingUpNow)
      
      // If scrolling up, show both toggles
      if (isScrollingUpNow) {
        setShowBoth(true)
      }
      
      // Update last scroll position
      setLastScrollY(currentScrollY)
      
      // Check if footer is in view
      const footer = document.querySelector('footer')
      if (footer) {
        const footerPosition = footer.getBoundingClientRect().top
        const isFooterInView = footerPosition <= window.innerHeight
        setIsVisible(!isFooterInView)
      }
    }

    // Set up scroll debounce
    let timeoutId: NodeJS.Timeout
    const debouncedScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const currentScrollY = window.scrollY
        const isAtTop = currentScrollY <= 0
        const isAtBottom = window.innerHeight + currentScrollY >= document.body.offsetHeight - 10
        
        // If we've stopped scrolling and we're not at the top/bottom, hide the timezone toggle
        if (!isAtTop && !isAtBottom && !isScrollingUp) {
          setShowBoth(false)
        }
      }, 150) // 150ms debounce
    }

    window.addEventListener('scroll', () => {
      handleScroll()
      debouncedScroll()
    })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [lastScrollY, isScrollingUp])

  const handleToggle = () => {
    toggleTimezone()
  }

  if (!isVisible) return null

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const formatOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: !use24HourFormat,
    timeZone: useServerTime ? 'UTC' : localTimeZone
  }
  
  const currentTime = new Date().toLocaleTimeString('en-US', formatOptions)
  const timezoneLabel = useServerTime ? 'Server Time (UTC)' : `Local Time (${localTimeZone})`
  const timeFormatLabel = use24HourFormat ? 'Switch to 12-hour format' : 'Switch to 24-hour format'
  
  // Calculate transition styles
  const formatToggleStyle: React.CSSProperties = {
    transform: showBoth ? 'translateY(0)' : 'translateY(calc(-100% - 12px))',
    opacity: showBoth ? 1 : 0,
    pointerEvents: showBoth ? 'auto' : 'none',
    transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
  }

  const timezoneToggleStyle: React.CSSProperties = {
    transform: 'translateY(0)',
    opacity: 1,
    transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3">
      {/* Timezone Toggle - Always visible */}
      <div style={timezoneToggleStyle}>
        <Tooltip 
          content={`${timezoneLabel} - ${currentTime}`}
          position="left"
        >
          <button
            onClick={toggleTimezone}
            className={`p-3 w-16 h-16 flex items-center justify-center rounded-full backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105 ${
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

      {/* 24-hour Format Toggle - Hidden when not scrolling */}
      <div style={formatToggleStyle}>
        <Tooltip 
          content={timeFormatLabel}
          position="left"
        >
          <button
            onClick={toggleTimeFormat}
            className={`p-3 w-16 h-16 flex items-center justify-center rounded-full backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105 ${
              use24HourFormat
                ? 'bg-green-600/90 border-green-400/50 hover:bg-green-700/90'
                : 'bg-purple-600/90 border-purple-400/50 hover:bg-purple-700/90'
            } border`}
            aria-label={timeFormatLabel}
          >
            <div className="flex flex-col items-center">
              {use24HourFormat ? (
                <Clock12 className="w-5 h-5 text-white" />
              ) : (
                <Clock9 className="w-5 h-5 text-white" />
              )}
              <span className="text-[10px] text-white/80 mt-1">
                {use24HourFormat ? '24h' : '12h'}
              </span>
            </div>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
