'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Skull, Plus, Trash2, User } from 'lucide-react'
import Image from 'next/image'

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
  discord_user?: {
    username: string
    discord_id: string
    avatar: string | null
  } | null
}

interface PlayerKillListProps {
  warId: string
  enemyFaction: string
}

interface WarLog {
  id: string
  date_time: string
  log_type: string
  friends_involved: string[]
  players_killed: string[]
  notes: string | null
  evidence_url: string | null
  submitted_by: string
  submitted_by_user: {
    username: string
    discord_id: string
    avatar: string | null
  }
}

export default function PlayerKillList({ warId, enemyFaction }: PlayerKillListProps) {
  const { data: session } = useSession()
  const [pkList, setPkList] = useState<PKEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [selectedFaction, setSelectedFaction] = useState<'FRIEND' | 'ENEMY'>('ENEMY')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const friendList = pkList.filter(p => p.faction === 'FRIEND').sort((a, b) => b.kill_count - a.kill_count)
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

  useEffect(() => {
    fetchPKList()
  }, [fetchPKList, warId])

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/wars/${warId}/pk-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          player_name: newPlayerName,
          faction: selectedFaction
        }),
      })

      if (res.ok) {
        setNewPlayerName('')
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
    // Check if we have a valid Discord user object or a discord_id
    const hasDiscordUser = Boolean(entry.discord_user?.discord_id)
    console.log('entry', entry)
    const hasDiscordId = Boolean(entry.discord_id)
    const isInDiscord = hasDiscordUser || hasDiscordId
    
    // Get the avatar URL if available
    let avatarUrl = null
    if (entry.discord_user?.avatar && entry.discord_user?.discord_id) {
      const format = entry.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'
      avatarUrl = `https://cdn.discordapp.com/avatars/${entry.discord_user.discord_id}/${entry.discord_user.avatar}.${format}?size=64`
    }
    
    return (
      <div
        key={entry.id}
        className="flex items-center justify-between px-3 py-2 bg-gang-primary/30 rounded hover:bg-gang-primary/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isInDiscord && avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt={entry.player_name}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : isInDiscord ? (
            <div className="w-7 h-7 bg-gang-highlight rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {entry.player_name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <span className={`text-sm font-medium truncate ${isInDiscord ? 'text-white' : 'text-gray-400'}`}>
            {entry.player_name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gang-highlight font-bold text-sm">×{entry.kill_count}</span>
          {isAdmin && (
            <button
              onClick={() => handleRemovePlayer(entry.id)}
              className="p-1 hover:bg-orange-500/20 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3 text-orange-400" />
            </button>
          )}
        </div>
      </div>
    )
  }

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
            Add Player
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

          {/* Low West Crew */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gang-highlight">Low West Crew</h4>
              <span className="text-xs text-gray-500">{friendList.length} killed</span>
            </div>
            {friendList.length === 0 ? (
              <div className="text-center py-4 bg-gang-primary/20 rounded">
                <p className="text-xs text-gray-500">No kills yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {friendList.map(renderPlayer)}
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
                  onChange={(e) => setSelectedFaction(e.target.value as 'FRIEND' | 'ENEMY')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
                >
                  <option value="ENEMY">{enemyFaction}</option>
                  <option value="FRIEND">Low West Crew</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Player Name (Firstname Lastname)
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  required
                  pattern="^[A-Z][a-z]+ [A-Z][a-z]+$"
                  title="Must be in Firstname Lastname format"
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                  Add Player
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
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
