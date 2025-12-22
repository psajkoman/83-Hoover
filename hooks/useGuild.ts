import { useState, useEffect, useCallback } from 'react';

interface GuildData {
  iconUrl: string | null;
  name: string | null;
}

export function useGuild() {
  const [guildData, setGuildData] = useState<GuildData>({
    iconUrl: null,
    name: 'Low West Crew' // Default fallback name
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGuild = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/discord/guild');
      if (!res.ok) {
        throw new Error(`Failed to fetch guild data: ${res.statusText}`);
      }
      
      const data = await res.json();
      setGuildData({
        iconUrl: data?.iconUrl || null,
        name: data?.name || 'Low West Crew' // Fallback name
      });
      return data;
    } catch (err) {
      console.error('Error fetching guild data:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      // Don't rethrow to prevent uncaught promise rejections
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuild();
  }, [fetchGuild]);

  return {
    ...guildData,
    isLoading,
    error,
    refetch: fetchGuild
  };
}