import { useState, useEffect, useRef } from 'react';

interface UseApiOptions extends RequestInit {
  enabled?: boolean;
  debounceMs?: number;
}

export function useApi<T>(url: string, options: UseApiOptions = {}) {
  const { enabled = true, debounceMs = 300, ...fetchOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, { 
          ...fetchOptions, 
          signal,
          headers: {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers || {})
          }
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            setError(err);
            console.error('API Error:', err);
          }
        } else {
          setError(new Error('An unknown error occurred'));
          console.error('Unknown API Error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      fetchData();
    }, debounceMs);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      controller.abort();
    };
  }, [url, JSON.stringify(fetchOptions), enabled, debounceMs]);

  return { data, loading, error };
}
