'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import { Users, Sword, Shield, Activity, MapPin } from 'lucide-react'
import DiscordMembersList from '@/components/admin/DiscordMembersList'
import Link from 'next/link'

interface ActivityLog {
  type: 'war' | 'log' | 'member' | 'turf'
  action: 'created' | 'updated' | 'deleted'
  target: string
  timestamp: string
  actor?: string
}

interface FactionStats {
  memberCount: number
  activeWars: number
  controlledTurf: number
  activityLog: ActivityLog[]
}

export default function HomePage() {
  const [stats, setStats] = useState<FactionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch Discord members (excludes bots)
        const membersRes = await fetch('/api/discord/members')
        const membersData = await membersRes.json()
        const humanMembers = membersData.members?.filter((m: any) => !m.bot) || []

        // Fetch active wars count - use a dedicated endpoint
        const warsRes = await fetch('/api/wars?status=ACTIVE')
        const { wars } = await warsRes.json()
        console.log('wars', wars)

        setStats({
          memberCount: humanMembers.length,
          activeWars: wars?.length || 0,
          controlledTurf: 5, // Hardcoded for now - replace with API call
          activityLog: [
            {
              type: 'member',
              action: 'created',
              target: 'Davion Porter',
              timestamp: new Date().toISOString(),
              actor: 'System'
            },
            {
              type: 'member',
              action: 'created',
              target: 'Daquan Grady',
              timestamp: new Date().toISOString(),
              actor: 'System'
            },
            {
              type: 'member',
              action: 'created',
              target: '5 new members',
              timestamp: new Date().toISOString(),
              actor: 'System'
            }
          ]
        })
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Loading faction statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          <span className="text-gang-highlight">Low West Crew</span> Faction Hub
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Territory control, member activity, and war statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {/* Member Count */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Members</h3>
              <p className="text-2xl font-bold">
                {stats?.memberCount || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Active Wars */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <Sword className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Active Wars</h3>
              <p className="text-2xl font-bold">
                {stats?.activeWars || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Controlled Turf */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <MapPin className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Turf</h3>
              <p className="text-2xl font-bold">
                {stats?.controlledTurf || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Log Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <Card variant="elevated">
            <h2 className="text-2xl font-bold text-white mb-4">Activity Log</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats?.activityLog?.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-800/30 rounded-lg transition-colors">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    log.type === 'war' ? 'bg-red-500' :
                    log.type === 'log' ? 'bg-blue-500' :
                    log.type === 'member' ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {log.actor || 'System'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {log.action} {log.type}: {log.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <Card variant="elevated">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/turf" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                🗺️ View Turf Map
              </Link>
              <Link href="/wars" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                ⚔️ Active Wars
              </Link>
              <Link href="/admin" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                👑 Member Management
              </Link>
              <Link href="/wars/" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                View Wars History
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Member Preview */}
      <Card variant="elevated">
        <h2 className="text-2xl font-bold text-white mb-4">Faction Members</h2>
        <DiscordMembersList />
      </Card>
    </div>
  )
}