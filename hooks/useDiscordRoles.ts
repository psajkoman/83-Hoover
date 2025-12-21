import { useState, useEffect } from 'react';
import { DiscordRole, DiscordRoleMap } from '@/types/discord';

export function useDiscordRoles() {
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [rolesMap, setRolesMap] = useState<DiscordRoleMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/discord/roles');
        if (!response.ok) {
          throw new Error('Failed to fetch Discord roles');
        }
        const data = await response.json();
        
        if (data.roles) {
          const rolesArray = data.roles as DiscordRole[];
          const map = rolesArray.reduce<DiscordRoleMap>((acc, role) => {
            acc[role.id] = role;
            return acc;
          }, {});
          
          setRoles(rolesArray);
          setRolesMap(map);
        }
      } catch (err) {
        console.error('Error fetching Discord roles:', err);
        setError(err instanceof Error ? err : new Error('Failed to load roles'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const getRoleById = (id: string): DiscordRole | undefined => {
    return rolesMap[id];
  };

  const getRoleName = (id: string): string => {
    return rolesMap[id]?.name || id;
  };

  const getRoleColor = (id: string): string => {
    const color = rolesMap[id]?.color;
    return color ? `#${color.toString(16).padStart(6, '0')}` : '#99aab5';
  };

  const getTextColor = (id: string): string => {
    const color = rolesMap[id]?.color;
    // return color ? (color > 0x808080 ? '#000' : '#fff') : '#fff';
    return '#ffffff';
  };

  return {
    roles,
    rolesMap,
    isLoading,
    error,
    getRoleById,
    getRoleName,
    getRoleColor,
    getTextColor,
  };
}
