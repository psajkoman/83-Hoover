import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const url = `${pathname}${search}`
  const userAgent = req.headers.get('user-agent') || 'unknown'

  // Add this near the top of your middleware function, with other path checks
  const ignoredPaths = [
    '/_next',
    '/api',
    '/favicon.ico',
    '/.well-known',
    '/__webpack_hmr',
    '/wp9075005.webp'
  ]

  if (ignoredPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Skip API routes and static files
  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  const isPublicPage = pathname === '/' || pathname.startsWith('/auth')

  // Get the session token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  })

  // Handle authentication redirects
  if (!token && !isPublicPage) {
    const callbackUrl = url
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', callbackUrl)
    return NextResponse.redirect(signInUrl)
  }

  // If user is authenticated, update their login history
  if (token) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, username')
        .eq('discord_id', token.discordId)
        .single()
      const displayName = userData?.display_name || userData?.username || token.username
      await supabase
        .from('login_history')
        .upsert({
          discord_id: token.discordId,
          username: displayName, // Use the display name from the database
          user_agent: userAgent,
          login_time: new Date().toISOString(),
          last_visited_url: url
        }, {
          onConflict: 'discord_id',
          ignoreDuplicates: false
        })
    } catch (error) {
      console.error('Error updating login history:', error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}