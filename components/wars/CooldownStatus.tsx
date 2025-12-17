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
      try {
        const lastTime = new Date(lastEncounterTime)
        if (isNaN(lastTime.getTime())) {
          console.error('Invalid lastEncounterTime:', lastEncounterTime)
          setTimeLeft('Now')
          return
        }

        const cooldownMs = cooldownHours * 60 * 60 * 1000
        const cooldownEnd = new Date(lastTime.getTime() + cooldownMs)
        const now = new Date()

        if (now >= cooldownEnd) {
          setTimeLeft('Now')
        } else {
          const diffMs = cooldownEnd.getTime() - now.getTime()
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMinutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60))

          if (diffHours > 0) {
            setTimeLeft(`${diffHours} hour${diffHours !== 1 ? 's' : ''} and ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`)
          } else {
            setTimeLeft(`${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`)
          }
        }
      } catch (error) {
        console.error('Error in updateCooldown:', error)
        setTimeLeft('Now')
      }
    }

    // Update immediately
    updateCooldown()

    // Then update every second
    const interval = setInterval(updateCooldown, 1000)

    return () => clearInterval(interval)
  }, [lastEncounterTime, cooldownHours])

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-gray-400">Cooldown status:</span>
      <span className="font-medium">
        {timeLeft === 'Now' ? (
          <span className="text-gang-green">Can attack now</span>
        ) : (
          <span>Can attack in {timeLeft}</span>
        )}
      </span>
    </div>
  )
}
