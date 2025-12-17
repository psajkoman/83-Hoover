'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { PlayerKillListItem } from './PlayerKillListItem'
import { WarStatsCard } from './WarStatsCard'
import { AddPlayerModal } from './AddPlayerModal'
import { PKEntry } from '../../types/war'

type DiscordMember = {
  id: string
  username: string
  nickname: string | null
  avatar: string | null
  discriminator: string
}

interface PlayerKillListProps {
  warId: string
  enemyFaction: string
  warStatus?: string
  logs?: any[]
  onUpdate?: () => void
}

export function PlayerKillList({ 
  warId, 
  enemyFaction, 
  warStatus = 'ACTIVE', 
  logs = [],
  onUpdate
}: PlayerKillListProps) {
  const { data: session } = useSession()
  const [pkList, setPkList] = useState<PKEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [warStats, setWarStats] = useState<{
    logCounts: Record<string, number>;
    topDeaths?: Array<[string, number]>;  
    topKills: Array<[string, number, 'FRIEND' | 'ENEMY']>;
    topSubmitters: Array<[string, number]>;
    winner: 'FRIEND' | 'ENEMY' | 'DRAW';
    friendKills: number;
    enemyKills: number;
  } | null>(null);

  const isAdmin = Boolean(session?.user?.role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(session.user.role as string))
  const isWarEnded = warStatus === 'ENDED'
  const friendList = pkList.filter(p => p.faction === 'FRIEND').sort((a, b) => b.kill_count - a.kill_count)
  const enemyList = pkList.filter(p => p.faction === 'ENEMY').sort((a, b) => b.kill_count - a.kill_count)

  const fetchPKList = useCallback(async () => {
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

  const handleAddPlayer = async (faction: 'FRIEND' | 'ENEMY', playerName: string) => {
    try {
      const res = await fetch(`/api/wars/${warId}/pk-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          player_name: playerName,
          faction
        }),
      })

      if (res.ok) {
        setShowAddModal(false)
        fetchPKList()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add player')
      }
    } catch (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player')
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

  useEffect(() => {
    if (!isWarEnded) {
      setWarStats(null)
      return
    }

    const logCounts = (logs || []).reduce<Record<string, number>>((acc, log) => {
      if (log?.log_type) {
        acc[log.log_type] = (acc[log.log_type] || 0) + 1
      }
      return acc
    }, {})

    // Track players killed in attacks (enemies killed by our faction)
    const killCounts = (logs || [])
      .filter((log: any) => log?.log_type === 'ATTACK' && Array.isArray(log.players_killed))
      .flatMap((log: any) => log.players_killed || [])
      .reduce<Record<string, number>>((acc, name: string) => {
        if (typeof name === 'string' && name.trim()) {
          acc[name] = (acc[name] || 0) + 1
        }
        return acc
      }, {})

    // Track our deaths (friends involved in defense logs)
    const deathCounts = (logs || [])
      .filter((log: any) => log?.log_type === 'DEFENSE' && Array.isArray(log.friends_involved))
      .flatMap((log: any) => log.friends_involved || [])
      .reduce<Record<string, number>>((acc, name: string) => {
        if (typeof name === 'string' && name.trim()) {
          acc[name] = (acc[name] || 0) + 1
        }
        return acc
      }, {})

    // Top players killed (both friends and enemies)
    const topKills = [
      ...Object.entries(killCounts).map(([name, count]) => [name, count, 'ENEMY'] as const),
      ...Object.entries(deathCounts).map(([name, count]) => [name, count, 'FRIEND'] as const)
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [string, number, 'FRIEND' | 'ENEMY'][];
      
    // Top deaths (our members who died in defense)
    const topDeaths = Object.entries(deathCounts)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5)

    const submitterCounts = (logs || []).reduce<Record<string, number>>((acc, log: any) => {
      const displayName = log?.submitted_by_display_name || log?.submitted_by_user?.username || log?.submitted_by;
      if (displayName) {
        acc[displayName] = (acc[displayName] || 0) + 1;
      }
      return acc;
    }, {})

    const topSubmitters = Object.entries(submitterCounts)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5)

    // Calculate friend and enemy kills from pkList
    const friendKills = pkList
      .filter(p => p.faction === 'FRIEND')
      .reduce((sum, p) => sum + (p.kill_count || 0), 0)
    
    const enemyKills = pkList
      .filter(p => p.faction === 'ENEMY')
      .reduce((sum, p) => sum + (p.kill_count || 0), 0)

    setWarStats({
      logCounts,
      topKills,
      topSubmitters,
      winner: friendKills > enemyKills ? 'FRIEND' : enemyKills > friendKills ? 'ENEMY' : 'DRAW',
      friendKills,
      enemyKills
    })
  }, [isWarEnded, logs, pkList])

  useEffect(() => {
    fetchPKList()
    fetchDiscordMembers()
  }, [fetchPKList])

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {isWarEnded ? 'Final Scoreboard' : 'Player Kill List'}
          </h3>
          {isAdmin && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              size="sm" 
              className="flex items-center gap-2"
            >
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
                <span className="text-xs text-gray-500">
                  {enemyList.reduce((sum, player) => sum + (player.kill_count || 1), 0)} deaths
                </span>
              </div>
              {enemyList.length === 0 ? (
                <div className="text-center py-4 bg-gang-primary/20 rounded">
                  <p className="text-xs text-gray-500">No kills yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {enemyList.map(entry => (
                    <PlayerKillListItem
                      key={entry.id}
                      entry={entry}
                      isAdmin={isAdmin}
                      onRemove={handleRemovePlayer}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Friend Faction */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gang-highlight">Low West Crew</h4>
                <span className="text-xs text-gray-500">
                  {friendList.reduce((sum, player) => sum + (player.kill_count || 1), 0)} deaths
                </span>
              </div>
              {friendList.length === 0 ? (
                <div className="text-center py-4 bg-gang-primary/20 rounded">
                  <p className="text-xs text-gray-500">No kills yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {friendList.map(entry => (
                    <PlayerKillListItem
                      key={entry.id}
                      entry={entry}
                      isAdmin={isAdmin}
                      onRemove={handleRemovePlayer}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* War Statistics for Ended Wars */}
      {isWarEnded && warStats && (
        <WarStatsCard 
          title="War Statistics"
          enemyFaction={enemyFaction}
          stats={warStats}
          friendList={friendList}
          enemyList={enemyList}
        />
      )}

      <AddPlayerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPlayer}
        enemyFaction={enemyFaction}
        discordMembers={discordMembers}
        isLoading={isLoadingMembers}
      />
    </div>
  )
}