'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDiscordRoles } from '@/hooks/useDiscordRoles';
import { DiscordMember } from '@/lib/discord/avatar';
import Image from 'next/image';
import { getAvatarUrl, getDefaultAvatarUrl } from '@/lib/discord/avatar';
import { format } from 'date-fns';

export default function RosterPage() {
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getRoleName, getRoleColor, getTextColor } = useDiscordRoles();

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (!a.joinedAt) return 1;
      if (!b.joinedAt) return -1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }, [members]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/discord/members');
        if (!response.ok) throw new Error('Failed to fetch members');
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">Faction Roster</h1>
        <p className="text-gray-400 text-lg">View all members and their roles</p>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          {sortedMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMembers.map((member) => {
                const displayName = member.nickname || member.display_name || member.username || 'Unknown';
                const avatarUrl = getAvatarUrl(member, 128) || 
                  (member.discriminator ? getDefaultAvatarUrl(member.discriminator) : null);

                return (
                  <div key={member.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center space-x-4">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-400">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-medium text-white truncate">{displayName}</p>
                          {member.joinedAt && (
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              Joined: {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        {member.roles && member.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(member.roles))
                              .filter(roleId => getRoleName(roleId) !== roleId)
                              .map((roleId) => {
                                const color = getRoleColor(roleId);
                                const textColor = getTextColor(roleId);
                                return (
                                  <span 
                                    key={roleId}
                                    className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
                                    style={{
                                      backgroundColor: `${color}40`,
                                      color: textColor,
                                      border: `1px solid ${color}80`,
                                    }}
                                  >
                                    {getRoleName(roleId)}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No members found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
