'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Flame } from 'lucide-react'
import { isWarHotSimple } from '@/lib/warUtils'
import Card from '@/components/ui/Card'
import { Swords, Calendar, Users, TrendingUp } from 'lucide-react'
import { createWarSlug } from '@/lib/warSlug'
import Button from '@/components/ui/Button'
import StartWarModal from '@/components/admin/StartWarModal'

interface War {
  id: string
  slug?: string
  enemy_faction: string
  status: string
  war_level?: string
  started_at: string
  ended_at: string | null
  war_logs: {
    date_time: string
  }[]
}

export default function WarsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeWars, setActiveWars] = useState<War[]>([])
  const [endedWars, setEndedWars] = useState<War[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showStartWarModal, setShowStartWarModal] = useState(false)


  useEffect(() => {
    fetchWars()
  }, [])

  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user) return
      try {
        const res = await fetch('/api/user/role')
        const data = await res.json()
        setUserRole(data.role)
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    fetchRole()
  }, [session])

    
  const sortWars = (wars: War[]) => {
    const sorted = [...wars].sort((a, b) => {
      // First priority: Hot wars come first
      const aIsHot = isWarHotSimple(a);
      const bIsHot = isWarHotSimple(b);
      
      if (aIsHot && !bIsHot) return -1;
      if (!aIsHot && bIsHot) return 1;
      
      // Sort logs by date in descending order
      const aLogs = [...(a.war_logs || [])].sort((x, y) => 
        new Date(y.date_time).getTime() - new Date(x.date_time).getTime()
      );
      const bLogs = [...(b.war_logs || [])].sort((x, y) => 
        new Date(y.date_time).getTime() - new Date(x.date_time).getTime()
      );
      
      const aLatestLog = aLogs[0]?.date_time;
      const bLatestLog = bLogs[0]?.date_time;
      
      // If both have logs, sort by most recent log
      if (aLatestLog && bLatestLog) {
        return new Date(bLatestLog).getTime() - new Date(aLatestLog).getTime();
      }
      
      // If only one has logs, it comes first
      if (aLatestLog) return -1;
      if (bLatestLog) return 1;
      
      // If neither has logs, sort by start date (newest first)
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
    return sorted;
  };

  const fetchWars = async () => {
    setIsLoading(true);
    try {
      const [activeRes, endedRes] = await Promise.all([
        fetch('/api/wars?status=ACTIVE', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        fetch('/api/wars?status=ENDED', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
      ]);

      if (!activeRes.ok || !endedRes.ok) {
        throw new Error('Failed to fetch wars');
      }

      const activeData = await activeRes.json();
      const endedData = await endedRes.json();

      // Debug logging
      console.log('Active wars raw data:', JSON.stringify(activeData.wars, null, 2));
      console.log('Ended wars raw data:', JSON.stringify(endedData.wars, null, 2));

      // Sort the wars
      const sortedActiveWars = sortWars(activeData.wars || []);
      const sortedEndedWars = sortWars(endedData.wars || []);

      // Debug logging for sorted results
      console.log('Sorted active wars:', sortedActiveWars.map((w: War) => ({
        enemy_faction: w.enemy_faction,
        hasLogs: !!w.war_logs?.length,
        latestLog: w.war_logs?.[0]?.date_time,
        isHot: isWarHotSimple(w)
      })));

      setActiveWars(sortedActiveWars);
      setEndedWars(sortedEndedWars);
    } catch (error) {
      console.error('Error fetching wars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLogCount = (war: War) => {
    console.log('WAR ', war)
    return war.war_logs.length || 0
  }

  const wars = activeTab === 'active' ? activeWars : endedWars

  const getWarLevelLabel = (level?: string) => {
    return level === 'LETHAL' ? 'Lethal' : 'Non-lethal'
  }

  const getWarLevelClasses = (level?: string) => {
    return level === 'LETHAL'
      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      : 'bg-gang-green/20 text-gang-green border border-gang-green/30'
  }

  const canStartWarAsMember = session?.user && userRole === 'MEMBER'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <Swords className="w-10 h-10 text-gang-highlight" />
            <h1 className="text-4xl font-bold text-white">Faction Wars</h1>
          </div>

          {canStartWarAsMember && (
            <Button onClick={() => setShowStartWarModal(true)} className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Start War
            </Button>
          )}
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
              className={`cursor-pointer hover:border-gang-highlight transition-all relative ${
                isWarHotSimple(war) ? 'border-2 border-orange-500' : 'border border-gray-700'
              }`}
              onClick={() => router.push(`/wars/${war.slug || createWarSlug(war.enemy_faction, war.started_at) || war.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {war.enemy_faction}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarLevelClasses(war.war_level)}`}>
                      {getWarLevelLabel(war.war_level)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(war.started_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isWarHotSimple(war) && (
                    <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      HOT
                    </span>
                  )}
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

      {showStartWarModal && (
        <StartWarModal
          mode="member"
          onClose={() => setShowStartWarModal(false)}
          onSuccess={() => {
            setShowStartWarModal(false)
            fetchWars()
          }}
        />
      )}
    </div>
  )
}
