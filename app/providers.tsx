'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'
import FullScreenLoader from '@/components/ui/Loader'
import { LoadingProvider, useLoading } from '@/contexts/LoadingContext'

function AuthProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [showAuthLoader, setShowAuthLoader] = useState(true)
  const { isLoading } = useLoading()

  useEffect(() => {
    // Hide auth loader after auth is determined or 5 seconds pass
    const timer = setTimeout(() => {
      setShowAuthLoader(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  // Hide auth loader when auth state is determined
  useEffect(() => {
    if (status !== 'loading') {
      setShowAuthLoader(false)
    }
  }, [status])

  // Show loader if either auth is still loading or there are pending data requests
  const showLoader = showAuthLoader || isLoading

  return (
    <>
      {showLoader && <FullScreenLoader />}
      {children}
    </>
  )
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LoadingProvider>
        <AuthProvider>{children}</AuthProvider>
      </LoadingProvider>
    </SessionProvider>
  )
}
