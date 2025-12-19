'use client'

import { useEffect, useState } from 'react'

export interface CooldownStatusProps {
  lastEncounterTime: string | null
  cooldownHours: number
  className?: string
}

export default function CooldownStatus({ 
  lastEncounterTime, 
  cooldownHours, 
  className = '' 
}: CooldownStatusProps) {
  const [timeLeft, setTimeLeft] = useState<string>('calculating...')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile on client side
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640) // Tailwind's 'sm' breakpoint
    }
    
    // Set initial value
    checkIfMobile()
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  useEffect(() => {
    if (!lastEncounterTime) {
      setTimeLeft('Now')
      return
    }

    const updateCooldown = () => {
      if (!lastEncounterTime) {
        setTimeLeft('Now')
        return
      }
      const lastEncounter = new Date(lastEncounterTime).getTime()
      const now = new Date().getTime()
      const cooldownEnd = lastEncounter + cooldownHours * 60 * 60 * 1000
      const timeRemaining = cooldownEnd - now
      
      if (timeRemaining <= 0) {
        setTimeLeft('Now')
      } else {
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
        
        if (isMobile) {
          // More compact format for mobile
          if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m`)
          } else {
            setTimeLeft(`${minutes}m ${seconds}s`)
          }
        } else {
          // Original format for desktop
          if (hours > 0) {
            setTimeLeft(`${hours} hours ${minutes} minutes ${seconds} seconds`)
          } else {
            setTimeLeft(`${minutes} minutes ${seconds} seconds`)
          }
        }
      }
    }

    // Update immediately
    updateCooldown()

    // Then update every second
    const interval = setInterval(updateCooldown, 1000)

    return () => clearInterval(interval)
  }, [lastEncounterTime, cooldownHours, isMobile])

  return (
    <div className={`flex items-center gap-2 text-sm sm:text-base ${className}`}>
      <span className="text-white">Cooldown:</span>
      <span className="text-gray-400 font-normal">
        {timeLeft === 'Now' ? (
          <span>{isMobile ? 'Ready' : 'Expired. You can attack now.'}</span>
        ) : (
          <span>{isMobile ? timeLeft : `In effect for ${timeLeft}`}</span>
        )}
      </span>
    </div>
  )
}