import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const isPublicPage = pathname === '/' || pathname.startsWith('/auth')

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  })
  if (!token && !isPublicPage) {
    const callbackUrl = `${pathname}${search}`
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', callbackUrl)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
