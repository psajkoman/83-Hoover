'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { Swords, Calendar, Users, TrendingUp } from 'lucide-react'

interface War {
  id: string
  enemy_faction: string
  status: string
  started_at: string
  ended_at: string | null
  war_logs: { count: number }[]
}

export default function WarsPage() {
  const router = useRouter()
  const [activeWars, setActiveWars] = useState<War[]>([])
  const [endedWars, setEndedWars] = useState<War[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active')

  useEffect(() => {
    fetchWars()
  }, [])

  const fetchWars = async () => {
    setIsLoading(true)
    try {
      const [activeRes, endedRes] = await Promise.all([
        fetch('/api/wars?status=ACTIVE'),
        fetch('/api/wars?status=ENDED'),
      ])

      const activeData = await activeRes.json()
      const endedData = await endedRes.json()

      setActiveWars(activeData.wars || [])
      setEndedWars(endedData.wars || [])
    } catch (error) {
      console.error('Error fetching wars:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getLogCount = (war: War) => {
    return war.war_logs?.[0]?.count || 0
  }

  const wars = activeTab === 'active' ? activeWars : endedWars

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Swords className="w-10 h-10 text-gang-highlight" />
          <h1 className="text-4xl font-bold text-white">Faction Wars</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Track ongoing conflicts and war history
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="text-center">
          <Swords className="w-8 h-8 mx-auto mb-2 text-gang-highlight" />
          <div className="text-3xl font-bold text-white mb-1">{activeWars.length}</div>
          <div className="text-sm text-gray-400">Active Wars</div>
        </Card>
        <Card className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gang-green" />
          <div className="text-3xl font-bold text-white mb-1">
            {activeWars.reduce((sum, war) => sum + getLogCount(war), 0)}
          </div>
          <div className="text-sm text-gray-400">Total Encounters</div>
        </Card>
        <Card className="text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-3xl font-bold text-white mb-1">{endedWars.length}</div>
          <div className="text-sm text-gray-400">Wars Ended</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-gang-highlight text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Active Wars ({activeWars.length})
        </button>
        <button
          onClick={() => setActiveTab('ended')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'ended'
              ? 'bg-gang-highlight text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          War History ({endedWars.length})
        </button>
      </div>

      {/* Wars List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Loading wars...</p>
        </div>
      ) : wars.length === 0 ? (
        <Card className="text-center py-12">
          <Swords className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">
            {activeTab === 'active' ? 'No active wars' : 'No war history'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wars.map((war) => (
            <Card
              key={war.id}
              className="cursor-pointer hover:border-gang-highlight transition-all"
              onClick={() => router.push(`/wars/${war.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {war.enemy_faction}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(war.started_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    war.status === 'ACTIVE'
                      ? 'bg-gang-highlight/20 text-gang-highlight'
                      : 'bg-gray-600/20 text-gray-400'
                  }`}
                >
                  {war.status}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Encounters</span>
                  <span className="text-white font-semibold">{getLogCount(war)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
