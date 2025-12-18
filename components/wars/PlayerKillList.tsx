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
  logs?: WarLog[]
  onUpdate?: () => void
}

type TopKillEntry = [string, number, 'FRIEND' | 'ENEMY'];

interface WarLog {
  log_type?: string;
  players_killed?: string[];
  friends_involved?: string[];
  submitted_by_display_name?: string;
  submitted_by_user?: { username: string };
  submitted_by?: string;
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
    topKills: TopKillEntry[];
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
      if (!res.ok) {
        throw new Error(`Failed to fetch PK list: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      setPkList(data.pkList || [])
    } catch (error) {
      console.error('Error fetching PK list:', error)
      // Optionally set an error state here to show to the user
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

    // Track enemy kills (enemies killed by our faction)
    const killCounts = (logs || [])
      .filter((log: any) => log?.log_type === 'ATTACK' && Array.isArray(log.players_killed))
      .flatMap((log: any) => log.players_killed || [])
      .reduce<Record<string, number>>((acc, name: string) => {
        if (typeof name === 'string' && name.trim()) {
          acc[name] = (acc[name] || 0) + 1
        }
        return acc
      }, {})

    // Track friend deaths (friends killed by enemies in defense logs)
    const friendDeaths = (logs || [])
      .filter((log: any) => log?.log_type === 'DEFENSE' && Array.isArray(log.players_killed))
      .flatMap((log: any) => log.players_killed || [])
      .reduce<Record<string, number>>((acc, name: string) => {
        if (typeof name === 'string' && name.trim()) {
          acc[name] = (acc[name] || 0) + 1
        }
        return acc
      }, {})

    // Track friend involvement (friends involved in defense logs)
    const friendInvolvement = (logs || [])
      .filter((log: any) => log?.log_type === 'DEFENSE' && Array.isArray(log.friends_involved))
      .flatMap((log: any) => log.friends_involved || [])
      .reduce<Record<string, number>>((acc, name: string) => {
        if (typeof name === 'string' && name.trim()) {
          acc[name] = (acc[name] || 0) + 1
        }
        return acc
      }, {})

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

    // Get friend kills from pkList
    const friendKillCounts = pkList
      .filter(p => p.faction === 'FRIEND' && p.kill_count > 0)
      .reduce<Record<string, number>>((acc, player) => {
        acc[player.player_name] = player.kill_count;
        return acc;
      }, {});

    const topKills: TopKillEntry[] = [
      // Friend kills (our faction's kills)
      ...Object.entries(friendKillCounts).map(
        ([name, count]) => [name, count, 'FRIEND'] as TopKillEntry
      ),
      // Enemy kills (enemies killed by our faction)
      ...Object.entries(killCounts).map(
        ([name, count]) => [name, count, 'ENEMY'] as TopKillEntry
      ),
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

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
    <div className="space-y-4 sm:space-y-6">
      <Card className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-3 sm:px-4 pt-3 sm:pt-4">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {isWarEnded ? 'Final Scoreboard' : 'Player Kill List'}
          </h3>
          {isAdmin && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              size="sm" 
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add Player</span>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-3 sm:px-4 pb-3 sm:pb-4">
            {/* Enemy Faction */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-sm font-semibold text-orange-400 truncate max-w-[70%]">{enemyFaction}</h4>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {enemyList.reduce((sum, player) => sum + (player.kill_count || 1), 0)} deaths
                </span>
              </div>
              {enemyList.length === 0 ? (
                <div className="text-center py-4 bg-gang-primary/20 rounded">
                  <p className="text-xs text-gray-500">No kills yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-80 sm:max-h-96 overflow-y-auto pr-1 -mr-1">
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
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-sm font-semibold text-gang-highlight">Low West Crew</h4>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {friendList.reduce((sum, player) => sum + (player.kill_count || 1), 0)} deaths
                </span>
              </div>
              {friendList.length === 0 ? (
                <div className="text-center py-4 bg-gang-primary/20 rounded">
                  <p className="text-xs text-gray-500">No kills yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-80 sm:max-h-96 overflow-y-auto pr-1 -mr-1">
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