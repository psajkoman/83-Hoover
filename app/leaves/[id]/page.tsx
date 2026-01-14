'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTimezone } from '@/contexts/TimezoneContext'
import { useApi } from '@/hooks/useApi'
import { useGuildData } from '../../hooks/v2/useGuildData'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar';
import type { DiscordMember } from '@/types/discord';

// Helper function to get a default avatar URL based on a user ID
const getDefaultAvatarForId = (id: string | null | undefined): string => {
  // If we have a valid ID, use the last digit to determine the default avatar
  if (id) {
    const lastDigit = id.slice(-1);
    const defaultIndex = isNaN(parseInt(lastDigit)) ? 0 : parseInt(lastDigit) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  // Fallback to a default avatar
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
};

type LeaveRow = {
  id: string
  requested_for_name: string
  requested_for_discord_id: string | null
  start_date: string
  end_date: string
  note: string | null
  status: 'AWAY' | 'DENIED' | 'RETURNED'
  created_at: string | null
  created_by: string | null
  creator_display_name: string | null
  creator_discord_id: string | null
  decided_by: string | null
  decided_at: string | null
  ended_by?: string | null
  ended_at?: string | null
}

export default function LeaveDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { data: session } = useSession()
  const { formatDateTime } = useTimezone()

  // Format date without time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Calculate number of days between two dates
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
  }

  // Get guild data for avatars and member info
  const { data: guildData } = useGuildData()

  // Helper function to find a member by Discord ID
  const getMemberById = (id: string | null): DiscordMember | null => {
    if (!id || !guildData?.members) return null;
    return guildData.members.find((member: DiscordMember) => member.id === id) || null;
  };

  // Get avatar URL with fallback to default
  const getAvatarForUser = (id: string | null, discriminator: string = '0'): string => {
    const member = getMemberById(id);
    if (member) {
      return getAvatarUrl(member, 128) || getDefaultAvatarUrl(discriminator);
    }
    // If no member found, use the ID to generate a consistent default avatar
    return getDefaultAvatarUrl(id ? (parseInt(id) % 5).toString() : discriminator);
  };

  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)

  const { data, loading, error } = useApi<{ leave: LeaveRow }>(`/api/leaves/${id}`, {
    enabled: !!session && !!id,
    debounceMs: 300,
  })

  const leave = data?.leave

  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)


  const canEndAbsence = useMemo(() => {
    if (!leave) return false
    const isRequester = session?.user?.id === leave.created_by
    const isSubject = session?.user?.username === leave.requested_for_name
    return (isAdmin || isRequester || isSubject) && leave.status === 'AWAY'
  }, [isAdmin, leave, session?.user?.id, session?.user?.username])

  const endAbsence = async () => {
    if (!id) return
    setActionError(null)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/leaves/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const payload = await res.json()
      if (!res.ok) {
        setActionError(payload?.error || 'Failed to end absence.')
        return
      }

      router.push('/leaves')
      router.refresh()
    } catch {
      setActionError('Failed to end absence.')
    } finally {
      setIsSaving(false)
    }
  }


  if (!session) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Card variant="elevated" className="p-8 text-center">
          <h3 className="text-lg font-medium text-white mb-2">Sign in to view leave details.</h3>
          <p className="text-gray-400">Please sign in to view leave details.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Leave Details</h1>
            <p className="text-gray-400 text-sm mt-1">View and manage this leave request.</p>
          </div>
          <Link 
            href="/leaves" 
            className="inline-flex items-center text-sm text-gray-300 hover:text-white transition-colors"
          >
            <span className="mr-1">←</span> Back to Leaves
          </Link>
        </div>
      </div>

      {loading ? (
        <Card variant="elevated" className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </Card>
      ) : error || !leave ? (
        <Card variant="elevated" className="p-8 text-center">
          <h2 className="text-lg font-medium text-white mb-2">Leave not found</h2>
          <p className="text-gray-400">The requested leave could not be found or you don't have permission to view it.</p>
        </Card>
      ) : (
        <Card variant="elevated" className="p-6 relative">
          {/* Status Badge - Moved to top right */}
          <div className="absolute top-6 right-6">
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              leave.status === 'AWAY' ? 'bg-orange-900/30 text-orange-300' :
              leave.status === 'RETURNED' ? 'bg-green-900/20 text-green-400' :
              'bg-red-900/20 text-red-400'
            }`}>
              <span className="h-2 w-2 rounded-full mr-2" style={{
                backgroundColor: leave.status === 'AWAY' ? '#FDBA74' :
                                leave.status === 'RETURNED' ? '#34D399' :
                                '#F87171'
              }}></span>
              {leave.status === 'AWAY' ? 'Away' : 
               leave.status === 'RETURNED' ? 'Returned' : 
               leave.status.charAt(0) + leave.status.slice(1).toLowerCase().replace('_', ' ')}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Member</h3>
                <div className="flex items-center space-x-3 pt-1">
                  <div className="relative h-9 w-9 rounded-full overflow-hidden">
                    <Image
                      src={getAvatarForUser(leave.requested_for_discord_id, '0')}
                      alt={leave.requested_for_name}
                      width={36}
                      height={36}
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getDefaultAvatarForId(leave.requested_for_discord_id);
                      }}
                    />
                  </div>
                  <p className="text-white font-medium">{leave.requested_for_name}</p>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</h3>
                <p className="text-white font-medium">
                  {calculateDays(leave.start_date, leave.end_date)} day{calculateDays(leave.start_date, leave.end_date) !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</h3>
                <p className="text-white font-medium">{formatDate(leave.start_date)}</p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Return Date</h3>
                <p className="text-white font-medium">{formatDate(leave.end_date)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</h3>
              <div className="text-white">
                {leave.note ? (
                  <p className="whitespace-pre-wrap text-sm">{leave.note}</p>
                ) : (
                  <span className="text-gray-400 text-sm italic">No additional notes.</span>
                )}
              </div>
            </div>


            <div className="space-y-4">
              {canEndAbsence && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Actions</h4>
                  <Button
                    variant="secondary"
                    onClick={endAbsence}
                    disabled={isSaving}
                    className="w-full sm:w-auto mb-4"
                  >
                    {isSaving ? 'Ending Absence...' : 'End Absence'}
                  </Button>
                  <div className="text-sm text-gray-400">
                    <p className="mb-2">This will:</p>
                    <ul className="space-y-1.5 list-disc pl-5">
                      <li>Remove the leave from the system</li>
                      <li>Change Discord name from{' '}
                        <span className="font-mono text-gray-200">{leave.requested_for_name} [LOA]</span> to{' '}
                        <span className="font-mono text-gray-200">{leave.requested_for_name}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {leave.created_at && (
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-end space-x-2 text-sm">
                    <span className="text-gray-500">Created by</span>
                    <div className="relative h-5 w-5 rounded-full overflow-hidden border border-gray-600">
                      <Image
                        src={getAvatarForUser(leave.creator_discord_id, '0')}
                        alt={leave.created_by === session?.user?.id ? 'You' : 'Creator'}
                        width={20}
                        height={20}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getDefaultAvatarForId(leave.creator_discord_id);
                        }}
                      />
                    </div>
                    <span className="text-gray-300">
                      {leave.created_by === session?.user?.id ? 'You' : leave.creator_display_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(leave.created_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
