'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Users, User, UserX, Users2 } from 'lucide-react'

interface WarStatsCardProps {
  title: string
  enemyFaction: string
  stats: {
    logCounts: Record<string, number>
    topKills: Array<[string, number, 'FRIEND' | 'ENEMY']>
    topSubmitters: Array<[string, number]>
    winner: 'FRIEND' | 'ENEMY' | 'DRAW'
    friendKills: number
    enemyKills: number
  }
  friendList?: Array<{ player_name: string }>
  enemyList?: Array<{ player_name: string }>
}

type KillViewMode = 'ALL' | 'FRIEND' | 'ENEMY'

export function WarStatsCard({ title, enemyFaction, stats, friendList = [], enemyList = [] }: WarStatsCardProps) {
  const [killViewMode, setKillViewMode] = useState<KillViewMode>('ALL')

  const filteredKills = useMemo(() => {
    if (!stats.topKills) return [];

    let filtered: Array<[string, number, 'FRIEND' | 'ENEMY']> = [];
    if (killViewMode === 'ALL') {
      filtered = stats.topKills;
    } else {
      filtered = stats.topKills.filter(([_, __, faction]) => faction === killViewMode);
    }
    
    // Sort by count (descending) and then by original order (ascending)
    return filtered
      .map((entry, index) => [...entry, index] as [string, number, 'FRIEND' | 'ENEMY', number]) // Preserve original order
      .sort((a, b) => {
        // First sort by count (descending)
        if (a[1] !== b[1]) return b[1] - a[1];
        // If counts are equal, sort by original position (ascending)
        return a[3] - b[3];
      })
      .slice(0, 3) // Take top 3
      .map(([name, count, faction]) => [name, count, faction] as [string, number, 'FRIEND' | 'ENEMY']); // Remove the index
  }, [stats.topKills, killViewMode]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      
      {/* Top Players by Deaths - Full width section */}
      <div className="bg-gang-primary/20 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-white">Top Players by Deaths</h4>
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white">
              {killViewMode === 'ALL' && <Users2 className="w-4 h-4" />}
              {killViewMode === 'FRIEND' && <User className="w-4 h-4" />}
              {killViewMode === 'ENEMY' && <UserX className="w-4 h-4" />}
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 z-10 hidden group-hover:block w-32 bg-gray-800 rounded-md shadow-lg">
              <button
                onClick={() => setKillViewMode('ALL')}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  killViewMode === 'ALL' ? 'bg-gang-highlight/20 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Users2 className="w-4 h-4" /> All
              </button>
              <button
                onClick={() => setKillViewMode('FRIEND')}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  killViewMode === 'FRIEND' ? 'bg-gang-highlight/20 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <User className="w-4 h-4" /> Friends
              </button>
              <button
                onClick={() => setKillViewMode('ENEMY')}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 rounded-b-md ${
                  killViewMode === 'ENEMY' ? 'bg-gang-highlight/20 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <UserX className="w-4 h-4" /> Enemies
              </button>
            </div>
          </div>
        </div>
        {filteredKills.length > 0 ? (
          <ul className="space-y-1">
            {filteredKills.map(([name, count, faction]) => (
              <li key={`${name}-${faction}`} className="flex justify-between">
                <span className={faction === 'FRIEND' ? 'text-gang-highlight' : 'text-orange-400'}>
                  {name}
                </span>
                <span className="text-gray-300">
                  {count} {count === 1 ? 'death' : 'deaths'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No data available</p>
        )}
      </div>

      {/* Grid for other sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Log Submitters */}
        <div className="bg-gang-primary/20 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Top Log Submitters</h4>
          {stats.topSubmitters.length > 0 ? (
            <ul className="space-y-1">
              {stats.topSubmitters.map(([name, count]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-gray-300">{name}</span>
                  <span className="text-gang-highlight">
                    {count} {count === 1 ? 'log' : 'logs'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        {/* Encounter Logs Summary */}
        <div className="bg-gang-primary/20 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Encounter Logs</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Attack Logs:</span>
              <span className="text-blue-400">
                {stats.logCounts['ATTACK'] || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Defense Logs:</span>
              <span className="text-red-400">
                {stats.logCounts['DEFENSE'] || 0}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-700">
              <div className="flex justify-between font-medium">
                <span>Winner:</span>
                <span className={
                  stats.winner === 'FRIEND' ? 'text-green-400' : 
                  stats.winner === 'ENEMY' ? 'text-red-400' : 
                  'text-yellow-400'
                }>
                  {stats.winner === 'FRIEND' 
                    ? 'Your Faction' 
                    : stats.winner === 'ENEMY' 
                      ? enemyFaction 
                      : 'Draw'}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {stats.friendKills} - {stats.enemyKills}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}