'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type LoadingContextType = {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0)

  const startLoading = () => {
    setLoadingCount(prev => prev + 1)
  }

  const stopLoading = () => {
    setLoadingCount(prev => Math.max(0, prev - 1))
  }

  return (
    <LoadingContext.Provider value={{ 
      isLoading: loadingCount > 0, 
      startLoading, 
      stopLoading 
    }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
