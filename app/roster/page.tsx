// app/roster/page.tsx
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar';
import { useGuildData } from '../hooks/v2/useGuildData';
import { useTimezone } from '@/contexts/TimezoneContext';
import type { DiscordMember, DiscordRole } from '@/types/discord';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { UserPlus, LogOut } from 'lucide-react';

type RosterMember = {
  id: string;
  username: string;
  display_name: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  joined_at: string;
  nickname?: string;  // Optional since not all members might have a nickname
  isInDiscord?: boolean;
  last_active?: string;
  role?: string;
  discord_id?: string;
};

export default function RosterPage() {
  const { data, isLoading, error, getMemberRoles, getRoleById } = useGuildData();
  const { formatDateTime } = useTimezone();
  const [usersWhoLeft, setUsersWhoLeft] = useState<RosterMember[]>([]);
  const [currentMemberIds, setCurrentMemberIds] = useState<Set<string>>(new Set());

  // Get the highest role for each member based on position
  const getHighestRole = (member: RosterMember): DiscordRole & { color: number } => {
    if (!member.roles || member.roles.length === 0) {
      return { 
        id: '', 
        name: 'Member', 
        position: -1, 
        color: 0,
        permissions: '',
        hoist: false,
        mentionable: false
      };
    }
    
    const memberRoles = member.roles
      .map(roleId => getRoleById(roleId))
      .filter((role): role is DiscordRole => role !== undefined);
      
    return memberRoles.sort((a, b) => b.position - a.position)[0] || 
      { 
        id: '', 
        name: 'Member', 
        position: -1, 
        color: 0,
        permissions: '',
        hoist: false,
        mentionable: false
      };
  };

  // Format role color to CSS hex code
  const getRoleColor = (color: number): string => {
    return color ? `#${color.toString(16).padStart(6, '0')}` : '#99aab5';
  };

  // Get text color based on background color (for contrast)
  const getTextColor = (bgColor: string): string => {
    if (!bgColor) return '#ffffff';
    
    // Convert hex to RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Fetch users who left Discord
  useEffect(() => {
    const fetchUsersWhoLeft = async () => {
      const supabase = createClientComponentClient<Database>();
      
      // Get current Discord members
      const members = data?.members || [];
      const memberIds = new Set(members.map(member => member.id));
      setCurrentMemberIds(memberIds);

      // Get all users from Supabase
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, discord_id, role, joined_at, last_active, avatar, display_name')
        .order('username', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Filter users who are not in the current Discord server
      const usersNotInDiscord = users
        .filter(user => user.discord_id && !memberIds.has(user.discord_id))
        .map(user => ({
          id: user.id,
          username: user.username || '',
          display_name: user.display_name || user.username || '',
          discriminator: '0', // Default discriminator
          avatar: user.avatar,
          roles: [], // Default empty roles array
          joined_at: user.joined_at || new Date().toISOString(),
          isInDiscord: false,
          last_active: user.last_active || null,
          role: user.role || 'MEMBER',
          discord_id: user.discord_id
        } as RosterMember));

      setUsersWhoLeft(usersNotInDiscord);
    };

    if (data?.members) {
      fetchUsersWhoLeft();
    }
  }, [data?.members]);

  // Sort members by join date (oldest first)
  // Update the sorting function to use joined_at directly
  const sortedMembers = useMemo(() => {
    if (!data?.members) return [];
    
    return [...data.members].sort((a, b) => {
      const dateA = a.joined_at || '';
      const dateB = b.joined_at || '';
      
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [data?.members]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-lg mb-4">Error loading roster data</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">Faction Roster</h1>
        <p className="text-gray-400 text-lg">
          {data?.members?.length || 0} members and their roles
        </p>
      </div>

      <div className="rounded-xl shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedMembers.length > 0 ? (
            sortedMembers.map((member: RosterMember) => {
              const hasNickname = Boolean(member.nickname || member.display_name);
              const displayName = hasNickname 
                ? (member.nickname || member.display_name || 'Unknown')
                : `@${member.username || 'unknown'}`;
              
              const avatarUrl = member.avatar 
                ? getAvatarUrl(member, 128)
                : getDefaultAvatarUrl(member.discriminator);
              
              const memberRoles = (member.roles || [])
                .map(roleId => getRoleById(roleId))
                .filter((role): role is DiscordRole => role !== undefined)
                .sort((a, b) => b.position - a.position);
                
              const highestRole = memberRoles[0] || { 
                id: '', 
                name: 'Member', 
                position: -1, 
                color: 0,
                permissions: '',
                hoist: false,
                mentionable: false
              };
              
              const roleColor = getRoleColor(highestRole.color);
              const textColor = getTextColor(roleColor);

              return (
                <div 
                  key={member.id} 
                  className="bg-gray-800/80 rounded-lg p-4 transition-all duration-200 border border-gray-700/50 hover:border-gray-500/50 flex flex-col gap-2 w-full cursor-default"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <div 
                          className="relative h-10 w-10 rounded-full overflow-hidden"
                          style={{ border: `2px solid ${roleColor}` }}
                        >
                          <Image
                            src={avatarUrl}
                            alt={displayName}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center font-medium"
                          style={{ 
                            backgroundColor: `${roleColor}30`,
                            color: textColor,
                            border: `2px solid ${roleColor}`
                          }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate" title={displayName}>
                        {displayName}
                      </p>
                      {member.joined_at && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span 
                            className="text-[11px] text-gray-400"
                            title={`Joined ${formatDateTime(new Date(member.joined_at))}`}
                          >
                            {format(new Date(member.joined_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      
                      {memberRoles.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {memberRoles.map((role) => {
                            const roleColor = getRoleColor(role.color);
                            return (
                              <span 
                                key={role.id}
                                className="px-1.5 py-0.5 text-[11px] rounded-full"
                                style={{
                                  backgroundColor: `${roleColor}15`,
                                  color: roleColor,
                                  border: `1px solid ${roleColor}30`,
                                }}
                                title={role.name}
                              >
                                {role.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-400">No members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Former Members Section */}
      {usersWhoLeft.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Former Members</h2>
            <div className="text-sm text-gray-400">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
              <span className="text-gray-200">{usersWhoLeft.length} total</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {usersWhoLeft.map((user) => {
              const roleColor = user.role === 'ADMIN' ? '#ef4444' : 
                              user.role === 'MODERATOR' ? '#3b82f6' : 
                              user.role === 'LEADER' ? '#8b5cf6' : '#6b7280';
              const textColor = getTextColor(roleColor);
              const displayName = user.display_name || user.username || 'Unknown';
              const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;

              return (
                <div 
                  key={user.id}
                  className="bg-gray-800/80 rounded-lg p-4 transition-all duration-200 border border-gray-700/50 hover:border-red-500/60 flex flex-col gap-2 w-full cursor-default"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="relative flex-shrink-0">
                      <div 
                        className="relative h-10 w-10 rounded-full overflow-hidden"
                        style={{ border: `2px solid ${roleColor}` }}
                      >
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate" title={displayName}>
                        {displayName}
                      </p>
                      <span className="text-xs text-gray-400 truncate block">
                        @{user.username}
                      </span>
                      
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span 
                          className="px-1.5 py-0.5 text-[11px] rounded-full"
                          style={{
                            backgroundColor: `${roleColor}15`,
                            color: roleColor,
                            border: `1px solid ${roleColor}30`,
                          }}
                          title={user.role || 'MEMBER'}
                        >
                          {user.role || 'MEMBER'}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs flex justify-between items-center text-gray-400 pt-1">
                        <div 
                          className="flex items-center gap-1 group relative" 
                          title={`Joined: ${user.joined_at ? formatDateTime(new Date(user.joined_at)) : 'N/A'}`}
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>
                            {user.joined_at ? format(new Date(user.joined_at), 'MMM d, yyyy') : 'N/A'}
                          </span>
                        </div>
                        {user.last_active && (
                          <div 
                            className="flex items-center gap-1 group relative"
                            title={`Left: ${formatDateTime(new Date(user.last_active))}`}
                          >
                            <LogOut className="w-3 h-3" />
                            <span>{format(new Date(user.last_active), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}