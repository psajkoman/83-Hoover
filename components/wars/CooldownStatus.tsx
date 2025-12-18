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
        
        // Format as "Hh Mm Ss" or "Mm Ss" if hours is 0
        if (hours > 0) {
          setTimeLeft(`${hours} hours ${minutes} minutes ${seconds} seconds`)
        } else {
          setTimeLeft(`${minutes} minutes ${seconds} seconds`)
        }
      }
    }

    // Update immediately
    updateCooldown()

    // Then update every second
    const interval = setInterval(updateCooldown, 1000)

    return () => clearInterval(interval)
  }, [lastEncounterTime, cooldownHours])

  return (
    <div className={`flex items-center gap-2 text-sm sm:text-base ${className}`}>
      <span className="text-white">Cooldown:</span>
      <span className="text-gray-400 font-normal">
        {timeLeft === 'Now' ? (
          <span>Expired. You can attack now.</span>
        ) : (
          <span>In effect for {timeLeft}</span>
        )}
      </span>
    </div>
  )
}
