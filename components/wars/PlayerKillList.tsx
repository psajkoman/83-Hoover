'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Skull, Plus, Trash2, User } from 'lucide-react'
import Image from 'next/image'

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  nickname: string | null
}

interface PKEntry {
  id: string
  player_name: string
  faction: string
  discord_id: string | null
  kill_count: number
  last_killed_at: string
  added_via: string
  added_by_user: {
    username: string
    discord_id: string
  }
  discord_user?: DiscordUser | null
}

interface PlayerKillListProps {
  warId: string
  enemyFaction: string
}

export default function PlayerKillList({ warId, enemyFaction }: PlayerKillListProps) {
  const { data: session } = useSession()
  const [pkList, setPkList] = useState<PKEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFaction, setSelectedFaction] = useState<'HOOVER' | 'ENEMY'>('ENEMY')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discordMembers, setDiscordMembers] = useState<DiscordUser[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const hooverList = pkList.filter(p => p.faction === 'HOOVER').sort((a, b) => b.kill_count - a.kill_count)
  const enemyList = pkList.filter(p => p.faction === 'ENEMY').sort((a, b) => b.kill_count - a.kill_count)

  const isAdmin = session?.user?.role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(session.user.role as string)

  const fetchPKList = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/wars/${warId}/pk-list`)
      const data = await res.json()
      setPkList(data.pkList || [])
    } catch (error) {
      console.error('Error fetching PK list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [warId])

  const fetchDiscordMembers = async () => {
    try {
      setIsLoadingMembers(true)
      const res = await fetch('/api/discord/members')
      if (res.ok) {
        const data = await res.json()
        setDiscordMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching Discord members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const getAvatarUrl = (user: { 
    discord_id?: string;  
    avatar: string | null; 
    discriminator: string 
  }) => {
    if (!user) return null
    if (user.avatar && user.discord_id) {  
      return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=64`
    }
    if (user.discriminator === '0') {
      // New username system (no discriminator)
      const defaultAvatar = user.discord_id ? (parseInt(user.discord_id) >> 22) % 6 : 0
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`
    }
    // Old username system with discriminator
    const defaultAvatarNum = parseInt(user.discriminator) % 5
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/wars/${warId}/pk-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          player_name: searchQuery,
          faction: selectedFaction
        }),
      })

      if (res.ok) {
        setSearchQuery('')
        setShowAddModal(false)
        fetchPKList()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add player')
      }
    } catch (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the PK list?')) return

    try {
      const res = await fetch(`/api/wars/${warId}/pk-list/${playerId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchPKList()
      }
    } catch (error) {
      console.error('Error removing player:', error)
    }
  }

  const renderPlayer = (entry: PKEntry) => {
    const discordUser = entry.discord_user
    const displayName = discordUser?.username || entry.player_name
    const avatarUrl = discordUser ? getAvatarUrl(discordUser) : null
 
    return (
      <div
        key={entry.id}
        className="flex items-center justify-between px-3 py-2 bg-gang-primary/30 rounded hover:bg-gang-primary/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {avatarUrl ? (
            <Image 
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {displayName}
            </div>
            {discordUser?.username && (
              <div className="text-xs text-gray-400 truncate">
                @{discordUser.username}
                {discordUser.discriminator !== '0' && `#${discordUser.discriminator}`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gang-highlight font-bold text-sm">×{entry.kill_count}</span>
          {isAdmin && (
            <button
              onClick={() => handleRemovePlayer(entry.id)}
              className="p-1 hover:bg-orange-500/20 rounded transition-colors text-gray-400 hover:text-white"
              title="Remove from list"
            >
              <Trash2 className="w-3 h-3 text-orange-400" />
            </button>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchPKList()
    fetchDiscordMembers()
  }, [fetchPKList, warId])

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skull className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-xl text-white">Player Kill List</h3>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Enemy Faction */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-orange-400">{enemyFaction}</h4>
              <span className="text-xs text-gray-500">{enemyList.length} killed</span>
            </div>
            {enemyList.length === 0 ? (
              <div className="text-center py-4 bg-gang-primary/20 rounded">
                <p className="text-xs text-gray-500">No kills yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {enemyList.map(renderPlayer)}
              </div>
            )}
          </div>

          {/* 83 Hoovers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gang-highlight">83 Hoovers</h4>
              <span className="text-xs text-gray-500">{hooverList.length} killed</span>
            </div>
            {hooverList.length === 0 ? (
              <div className="text-center py-4 bg-gang-primary/20 rounded">
                <p className="text-xs text-gray-500">No kills yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {hooverList.map(renderPlayer)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Add Player to PK List</h3>
            <form onSubmit={handleAddPlayer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Faction
                </label>
                <select
                  value={selectedFaction}
                  onChange={(e) => setSelectedFaction(e.target.value as 'HOOVER' | 'ENEMY')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
                >
                  <option value="ENEMY">{enemyFaction}</option>
                  <option value="HOOVER">83 Hoovers</option>
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
                              src={member.avatar || '/default-avatar.png'}
                              alt={member.username}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-white truncate">
                                {member.username}
                              </div>
                              {member.nickname && (
                                <div className="text-xs text-gray-400 truncate">
                                  @{member.username}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      {searchQuery && !isLoadingMembers && !discordMembers.some(m => 
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
                  isLoading={isSubmitting} 
                  className="flex-1"
                  disabled={!searchQuery.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Player'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setShowAddModal(false)
                    setSearchQuery('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
