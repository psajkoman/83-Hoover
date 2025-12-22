import { useState, useEffect } from 'react';

interface UserData {
  id: string;
  discord_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  id?: string;
  user_id: string;
  // Add other settings fields as needed
  [key: string]: any;
}

interface UserActivity {
  id?: string;
  user_id: string;
  last_active?: string;
  // Add other activity fields as needed
  [key: string]: any;
}

interface UserResponse {
  user: UserData;
  settings: UserSettings;
  activity: UserActivity;
}

export function useUserData() {
  const [data, setData] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/user/me');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized (user not logged in)
          setData(null);
          setError(new Error('Not authenticated'));
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load user data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to update user settings
  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const response = await fetch('/api/v2/user/me/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      // Refresh user data
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  return {
    user: data?.user || null,
    settings: data?.settings || {},
    activity: data?.activity || {},
    isLoading,
    error,
    refetch: fetchData,
    updateSettings,
  };
}
