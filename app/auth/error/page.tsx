'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card variant="elevated" className="p-8 text-center">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            Authentication Error
          </h1>
          
          <p className="text-gray-400 mb-6">
            {error === 'AccessDenied' 
              ? 'You do not have permission to access this platform. Please ensure you are a member of the 83 Hoover Discord server.'
              : 'An error occurred during authentication. Please try again.'}
          </p>

          <div className="space-y-3">
            <Link href="/auth/signin">
              <Button className="w-full">
                Try Again
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Return Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
