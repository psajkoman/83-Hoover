'use client'

import { useSession } from 'next-auth/react'
import { format, parseISO } from 'date-fns'
import { redirect } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { DiscordMember, getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar'
import type { User } from 'next-auth'
import { useGuild } from '@/hooks/useGuild'
import { useDiscordRoles } from '@/hooks/useDiscordRoles'
import { useTimezone } from '@/contexts/TimezoneContext'
import dynamic from 'next/dynamic'

type WarLog = {
  id: string;
  date_time: string;
  log_type: 'ATTACK' | 'DEFENSE';
  notes: string | null;
  evidence_url: string | null;
  members_involved: string[];
  players_killed?: string[];  
  war: {
    slug: string;
    enemy_faction: string;
    status: string;
    started_at: string;
    ended_at: string | null;
  };
};

// Dynamically import the LeavesSection component with SSR disabled
const LeavesSection = dynamic(
  () => import('./components/LeavesSection'),
  { ssr: false }
);

export default function ProfilePage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin')
    }
  })

  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([])
  const [warLogs, setWarLogs] = useState<WarLog[]>([])
  const [isLoadingWarLogs, setIsLoadingWarLogs] = useState(true)
  const [hasActiveLeave, setHasActiveLeave] = useState(false);
  const [activeLeaveEndDate, setActiveLeaveEndDate] = useState('');
  
  const { name: guildName, isLoading: isGuildLoading } = useGuild()
  const { roles, getRoleName, getRoleColor, getTextColor } = useDiscordRoles()
  const { formatDateTime } = useTimezone();
  
  const totalDeaths = useMemo(() => {
    if (!warLogs.length || status === 'loading' || !session?.user?.name) return 0;
    const userDisplayName = session.user.name;
    return warLogs.reduce((total, log) => {
      return total + (log.players_killed?.filter(name => name === userDisplayName).length || 0);
    }, 0);
  }, [warLogs, session?.user?.name, status]);

  const getServerDisplayName = useMemo(() => (discordId: string | undefined, fallback: string) => {
    if (!discordId) return fallback
    const member = discordMembers.find(m => m.id === discordId)
    return member?.nickname || member?.display_name || member?.username || fallback
  }, [discordMembers])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Discord members and war logs in parallel
        const [membersRes, logsRes] = await Promise.all([
          fetch('/api/discord/members'),
          fetch('/api/wars/user')
        ])
        
        const membersData = await membersRes.json()
        if (membersData.members) {
          setDiscordMembers(membersData.members)
        }

        const logsData = await logsRes.json()
        if (logsData.warLogs) {
          setWarLogs(logsData.warLogs)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoadingWarLogs(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const checkActiveLeaves = async () => {
      try {
        const response = await fetch('/api/leaves?scope=my');
        if (!response.ok) return;
        
        const data = await response.json();
        const now = new Date();
        
        const activeLeave = (data.leaves || []).find((leave: any) => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          return leave.status === 'APPROVED' && now >= start && now <= end;
        });
        
        if (activeLeave) {
          setHasActiveLeave(true);
          setActiveLeaveEndDate(new Date(activeLeave.end_date).toLocaleDateString());
        } else {
          setHasActiveLeave(false);
        }
      } catch (error) {
        console.error('Error checking active leaves:', error);
      }
    };
    
    checkActiveLeaves();
  }, [session?.user?.id]);

  const getMemberJoinDate = useMemo(() => (discordId?: string) => {
    if (!discordId) return null
    const member = discordMembers.find(m => m.id === discordId)
    return member?.joinedAt ? new Date(member.joinedAt) : null
  }, [discordMembers])

  if (status === 'loading' || isGuildLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }
  const user = session.user as User
  const discordId = user.discordId
  const username = user.name || user.username || 'User'
  const displayName = getServerDisplayName(discordId, username)
  const joinDate = getMemberJoinDate(discordId)
  
  const memberSince = joinDate
    ? joinDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'

  // Get the current member's data
  const currentMember = discordMembers.find(m => m.id === discordId)
  const avatarUrl = getAvatarUrl(currentMember, 256) || 
    (user.discriminator ? getDefaultAvatarUrl(user.discriminator) : null)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          My Profile
        </h1>
        <p className="text-gray-400 text-lg">
          Manage your account and preferences
        </p>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400">
                {displayName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {displayName}
            </h2>
            <p className="text-gray-400">
                {guildName ? `Member of ${guildName} since ${memberSince}` : `Member since ${memberSince}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Account Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-400">Display Name</p>
                <p className="text-white">{displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Account Status</p>
                <div className="flex items-center">
                  <div className={`h-2.5 w-2.5 rounded-full mr-2 ${hasActiveLeave ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                  <p className={hasActiveLeave ? 'text-orange-400' : 'text-green-400'}>
                    {hasActiveLeave ? 'Away on Leave' : 'Active'}
                  </p>
                </div>
                {hasActiveLeave && (
                  <p className="text-xs text-gray-400 mt-1">
                    Until {activeLeaveEndDate}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {currentMember?.roles
                    ?.filter((roleId: string) => {
                      const role = roles.find(r => r.id === roleId);
                      return role && getRoleName(roleId) !== roleId && !role.name.toLowerCase().includes('notify');
                    })
                    .sort((a: string, b: string) => {
                      const roleA = roles.find(r => r.id === a);
                      const roleB = roles.find(r => r.id === b);
                      return (roleB?.position || 0) - (roleA?.position || 0);
                    })
                    .map((roleId: string) => {
                      const color = getRoleColor(roleId);
                      const textColor = getTextColor(roleId);
                      
                      return (
                        <span 
                          key={roleId}
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${color}40`,
                            color: textColor,
                            border: `1px solid ${color}80`,
                          }}
                        >
                          {getRoleName(roleId)}
                        </span>
                      );
                    }) || (
                      <span className="text-gray-400 text-sm">No roles assigned</span>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <LeavesSection />

        <div className="bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">War Stats</h3>
          {isLoadingWarLogs ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : warLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-center text-gray-400">All Interactions</p>
                  <p className="text-2xl font-bold text-center text-white">{warLogs.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-center text-gray-400">Attack / Defense</p>
                  <p className="text-2xl font-bold text-center text-white">
                    {warLogs.filter(log => log.log_type === 'ATTACK').length} : {warLogs.filter(log => log.log_type === 'DEFENSE').length}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-center text-gray-400">Total Deaths</p>
                  <p className="text-2xl font-bold text-center text-white">{totalDeaths}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Interactions</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {warLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="bg-gray-800 p-3 rounded-lg hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-white">
                            <a 
                              href={`/wars/${log.war?.slug}`} 
                              className="hover:text-blue-400 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {log.war?.enemy_faction || 'Unknown Faction'}
                            </a>
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              log.log_type === 'ATTACK' 
                                ? 'bg-red-900/50 text-red-200' 
                                : 'bg-blue-900/50 text-blue-200'
                            }`}>
                              {log.log_type}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(log.date_time)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Participants</p>
                          <p className="text-sm text-white">
                            {log.members_involved?.length || 0} members
                          </p>
                        </div>
                      </div>
                      {log.notes && (
                        <p className="mt-2 text-sm text-gray-300 line-clamp-2 bg-gray-700/50 p-2 rounded">
                          {log.notes.length > 100 ? `${log.notes.substring(0, 100)}...` : log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400">No war interactions found.</p>
              <p className="text-sm text-gray-500 mt-1">Your war interactions will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}