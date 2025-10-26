'use client'

import { useEffect, useState } from 'react'

type InGameMember = {
  id: string
  name: string
  // Add other fields from the API response as needed
}

export default function InGameMembers() {
  const [inGameMembers, setInGameMembers] = useState<InGameMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInGameMembers = async () => {
      try {
        setLoading(true)
        const response = await fetch('https://ucp.ls-rp.com/api/sa/player-list')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('In-game members data:', data)
        setInGameMembers(data)
      } catch (err) {
        console.error('Error fetching in-game members:', err)
        setError('Failed to load in-game members')
      } finally {
        setLoading(false)
      }
    }

    fetchInGameMembers()
  }, [])

  if (loading) return <div>Loading in-game members...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="p-4 bg-gang-primary rounded-lg border border-gang-accent/30">
      <h3 className="text-lg font-bold mb-4">Members In-Game</h3>
      {inGameMembers.length > 0 ? (
        <ul className="space-y-2">
          {inGameMembers.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{member.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No members currently in-game</p>
      )}
    </div>
  )
}
