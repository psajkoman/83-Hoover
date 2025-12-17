'use client'

import { useState } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (faction: 'FRIEND' | 'ENEMY', playerName: string) => void
  enemyFaction: string
  discordMembers: Array<{
    id: string
    username: string
    nickname: string | null
    avatar: string | null
    discriminator: string
  }>
  isLoading?: boolean
}

export function AddPlayerModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  enemyFaction, 
  discordMembers,
  isLoading = false
}: AddPlayerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFaction, setSelectedFaction] = useState<'FRIEND' | 'ENEMY'>('ENEMY')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    onAdd(selectedFaction, searchQuery)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-white mb-4">Add Player to PK List</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Faction
            </label>
            <select
              value={selectedFaction}
              onChange={(e) => setSelectedFaction(e.target.value as 'FRIEND' | 'ENEMY')}
              className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
            >
              <option value="ENEMY">{enemyFaction}</option>
              <option value="FRIEND">Low West Crew</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Player
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter player name or select from list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight"
              />
              {searchQuery && (
                <div className="absolute z-10 mt-1 w-full bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {discordMembers
                    .filter(member => 
                      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (member.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .slice(0, 5)
                    .map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gang-highlight/20 cursor-pointer"
                        onClick={() => {
                          setSearchQuery(member.nickname || member.username)
                        }}
                      >
                        <Image 
                          src={member.avatar ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png` : '/default-avatar.png'}
                          alt={member.username}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">
                            {member.nickname || member.username}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            @{member.username}
                          </div>
                        </div>
                      </div>
                    ))}
                  {searchQuery && !discordMembers.some(m => 
                    (m.nickname?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    m.username.toLowerCase().includes(searchQuery.toLowerCase())
                  ) && (
                    <div className="px-4 py-2 text-sm text-gray-400">
                      No matching players found. Press Enter to add manually.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              type="submit" 
              isLoading={isLoading} 
              className="flex-1"
              disabled={!searchQuery.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Player'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}