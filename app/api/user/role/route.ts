import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    return NextResponse.json({ role: user?.role || 'MEMBER' })
  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user role' },
      { status: 500 }
    )
  }
}
