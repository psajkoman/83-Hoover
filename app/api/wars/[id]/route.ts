import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    const { data: war, error } = await supabase
      .from('faction_wars')
      .select(`
        *,
        started_by_user:users!faction_wars_started_by_fkey(username, discord_id)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ war })
  } catch (error) {
    console.error('Error fetching war:', error)
    return NextResponse.json(
      { error: 'Failed to fetch war' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'ENDED') {
        updateData.ended_at = new Date().toISOString()
      }
    }

    const { data: war, error } = await supabase
      .from('faction_wars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ war })
  } catch (error) {
    console.error('Error updating war:', error)
    return NextResponse.json(
      { error: 'Failed to update war' },
      { status: 500 }
    )
  }
}
