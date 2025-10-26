'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in. Make sure you are a member of the Discord server.',
    Verification: 'The verification token has expired or has already been used.',
    Default: 'An error occurred during sign in. Please try again.',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gang-highlight rounded-2xl flex items-center justify-center font-bold text-white text-3xl mx-auto mb-4">
            83
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to 83 Hoover
          </h1>
          <p className="text-gray-400">
            Sign in with Discord to access the faction hub
          </p>
        </div>

        <Card variant="elevated" className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 text-sm font-medium mb-1">Sign In Error</p>
                <p className="text-orange-300 text-sm">
                  {errorMessages[error] || errorMessages.Default}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() => signIn('discord', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 py-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Sign in with Discord
          </Button>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>By signing in, you agree to our terms of service</p>
            <p className="mt-2">You must be a member of the 83 Hoover Discord server</p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <a
            href="https://discord.gg/your-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gang-highlight hover:text-gang-highlight/80 text-sm transition-colors"
          >
            Don&apos;t have Discord access? Join our server →
          </a>
        </div>
      </div>
    </div>
  )
}
