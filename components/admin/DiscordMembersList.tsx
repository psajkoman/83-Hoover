'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import { Users, RefreshCw, Search } from 'lucide-react'
import Image from 'next/image'
import { DiscordMember, getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar'

export default function DiscordMembersList() {
  const [members, setMembers] = useState<DiscordMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<DiscordMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/discord/members')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members')
      }

      // Filter out bots
      const humanMembers = data.members.filter((m: DiscordMember) => !m.bot)
      setMembers(humanMembers)
      setFilteredMembers(humanMembers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = members.filter(
        (member) =>
          member.username.toLowerCase().includes(query) ||
          member.nickname?.toLowerCase().includes(query)
      )
      setFilteredMembers(filtered)
    }
  }, [searchQuery, members])

  if (error) {
    return (
      <Card variant="elevated">
        <div className="text-center py-8">
          <p className="text-orange-400 mb-4">{error}</p>
          <button
            onClick={fetchMembers}
            className="px-4 py-2 bg-gang-highlight hover:bg-gang-highlight/90 rounded-lg text-white font-medium transition-colors"
          >
            Try Again
          </button>
          <p className="text-sm text-gray-400 mt-4">
            Make sure DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are set in environment variables
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gang-highlight" />
          <h3 className="font-bold text-xl text-white">
            Faction Roster ({filteredMembers.length})
          </h3>
        </div>
        <button
          onClick={fetchMembers}
          disabled={isLoading}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh members"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gang-highlight"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Loading Discord members...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              {searchQuery ? 'No members found' : 'No members to display'}
            </p>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <Image 
                  src={getAvatarUrl(member, 40) || getDefaultAvatarUrl(member.discriminator)}
                  alt={`${member.username}'s avatar`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {member.nickname || member.username}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {member.username}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
