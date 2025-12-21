import { useState, useEffect, useCallback } from 'react';

interface GuildData {
  iconUrl: string | null;
  name: string | null;
}

export function useGuild() {
  const [guildData, setGuildData] = useState<GuildData>({
    iconUrl: null,
    name: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGuild = useCallback(async () => {
    try {
      const res = await fetch('/api/discord/guild');
      if (!res.ok) throw new Error('Failed to fetch guild data');
      
      const data = await res.json();
      setGuildData({
        iconUrl: data?.iconUrl || null,
        name: data?.name || null
      });
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
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