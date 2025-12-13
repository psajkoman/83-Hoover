import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Edit a war log
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { id, logId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date_time, log_type, friends_involved, players_killed, notes, evidence_url } = body

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user owns the log or is admin
    const { data: log } = await supabase
      .from('war_logs')
      .select('submitted_by')
      .eq('id', logId)
      .single()

    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)
    const isOwner = log?.submitted_by === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'You can only edit your own logs' }, { status: 403 })
    }

    // Update the log
    const { error } = await supabase
      .from('war_logs')
      .update({
        date_time,
        log_type,
        friends_involved,
        players_killed,
        notes,
        evidence_url,
        edited_by: user.id,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating war log:', error)
    return NextResponse.json(
      { error: 'Failed to update war log' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { id, logId } = await params
    const session = await getServerSession(authOptions)
    
    console.log('DELETE request - session:', session?.user)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    const discordId = (session.user as any).discordId || (session.user as any).id
    console.log('Looking up user with discordId:', discordId)

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('discord_id', discordId)
      .single()

    if (userError) {
      console.error('User lookup error:', userError)
      return NextResponse.json({ error: 'User lookup failed: ' + userError.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('User found:', user)

    // Only admins can delete logs
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can delete logs' }, { status: 403 })
    }

    const { error } = await supabase
      .from('war_logs')
      .delete()
      .eq('id', logId)

    if (error) {
      console.error('Delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting war log:', error)
    return NextResponse.json(
      { error: 'Failed to delete war log: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
