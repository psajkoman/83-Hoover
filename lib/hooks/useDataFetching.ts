'use client'

import { useEffect, useState } from 'react'
import { useLoading } from '@/contexts/LoadingContext'

export function useDataFetching<T>(fetchFunction: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const { startLoading, stopLoading } = useLoading()

  useEffect(() => {
    const fetchData = async () => {
      startLoading()
      try {
        const result = await fetchFunction()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'))
      } finally {
        stopLoading()
      }
    }

    fetchData()
    
    return () => {
      // Cleanup function to stop loading if component unmounts
      stopLoading()
    }
  }, [fetchFunction, startLoading, stopLoading])

  return { data, error }
}
