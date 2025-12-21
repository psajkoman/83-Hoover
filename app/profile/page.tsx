'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { DiscordMember, getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar'
import type { User } from 'next-auth'
import { useGuild } from '@/hooks/useGuild'

export default function ProfilePage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin')
    }
  })

  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { name: guildName, isLoading: isGuildLoading } = useGuild()

  useEffect(() => {
    const fetchDiscordMembers = async () => {
      try {
        const res = await fetch('/api/discord/members')
        const data = await res.json()
        if (data.members) {
          setDiscordMembers(data.members)
        }
      } catch (error) {
        console.error('Error fetching Discord members:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDiscordMembers()
  }, [])

  const getServerDisplayName = (discordId: string | undefined, fallback: string) => {
    if (!discordId) return fallback
    const member = discordMembers.find(m => m.id === discordId)
    return member?.nickname || member?.display_name || member?.username || fallback
  }

  const getMemberJoinDate = (discordId?: string) => {
    if (!discordId) return null
    const member = discordMembers.find(m => m.id === discordId)
    return member?.joinedAt ? new Date(member.joinedAt) : null
  }

  if (status === 'loading' || isLoading || isGuildLoading) {
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
        <div className="bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Account Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-400">Display Name</p>
              <p className="text-white">{displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Account Status</p>
              <p className="text-green-400">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Leave of Absence</h3>
          <p className="text-gray-400"></p>
        </div>
      </div>
    </div>
  )
}