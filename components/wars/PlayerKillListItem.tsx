'use client'

import Image from 'next/image'
import { Trash2, User } from 'lucide-react'
import { PKEntry } from '@/types/war'

interface PlayerKillListItemProps {
  entry: PKEntry
  isAdmin: boolean
  onRemove: (id: string) => void
}

export function PlayerKillListItem({ entry, isAdmin, onRemove }: PlayerKillListItemProps) {
  const discordUser = entry.discord_user
  const displayName = discordUser?.username || entry.player_name
  const avatarUrl = discordUser?.avatar && entry.discord_id
    ? `https://cdn.discordapp.com/avatars/${entry.discord_id}/${discordUser.avatar}${discordUser.avatar.startsWith('a_') ? '.gif' : '.png'}?size=64`
    : null

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gang-primary/30 rounded hover:bg-gang-primary/50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {avatarUrl ? (
          <Image 
            src={avatarUrl}
            alt={displayName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {entry.player_name}
          </div>
          {discordUser?.username && (
            <div className="text-xs text-gray-400 truncate">
              @{discordUser.username}
              {discordUser.discriminator !== '0' && `#${discordUser.discriminator}`}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-gang-highlight font-bold text-sm">×{entry.kill_count}</span>
        {isAdmin && (
          <button
            onClick={() => onRemove(entry.id)}
            className="p-1 hover:bg-orange-500/20 rounded transition-colors text-gray-400 hover:text-white"
            title="Remove from list"
          >
            <Trash2 className="w-3 h-3 text-orange-400" />
          </button>
        )}
      </div>
    </div>
  )
}