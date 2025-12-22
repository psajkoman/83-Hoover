import { useState, useEffect } from 'react';

interface DiscordMember {
  id: string;
  username: string;
  display_name: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  joined_at: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  mentionable: boolean;
  hoist: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string;
  position: number;
}

interface GuildData {
  members: DiscordMember[];
  roles: DiscordRole[];
  channels: DiscordChannel[];
  timestamp: string;
}

export function useGuildData() {
  const [data, setData] = useState<GuildData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/discord/guild');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching guild data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load guild data'));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  // Helper functions
  const getMemberById = (id: string) => {
    return data?.members.find(member => member.id === id);
  };
  const getRoleById = (id: string) => {
    return data?.roles.find(role => role.id === id);
  };
  const getChannelById = (id: string) => {
    return data?.channels.find(channel => channel.id === id);
  };
  const getMemberRoles = (member: DiscordMember) => {
    if (!data) return [];
    return data.roles
      .filter(role => member.roles.includes(role.id))
      .sort((a, b) => b.position - a.position);
  };
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    getMemberById,
    getRoleById,
    getChannelById,
    getMemberRoles,
  };
}
// Export types for external use
export type { DiscordMember, DiscordRole, DiscordChannel, GuildData };