import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUuid } from '@/lib/warSlug'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    let warId = id
    if (!isUuid(id)) {
      const { data: warBySlug, error: warBySlugError } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (warBySlugError) throw warBySlugError
      if (!warBySlug) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }
      warId = warBySlug.id
    }

    const { data: logs, error } = await supabase
      .from('war_logs')
      .select(`
        *,
        submitted_by_user:users!war_logs_submitted_by_fkey(username, discord_id, avatar),
        edited_by_user:users!war_logs_edited_by_fkey(username, discord_id, avatar)
      `)
      .eq('war_id', warId)
      .order('date_time', { ascending: false })

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching war logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch war logs' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    let warId = id
    if (!isUuid(id)) {
      const { data: warBySlug, error: warBySlugError } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (warBySlugError) throw warBySlugError
      if (!warBySlug) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }
      warId = warBySlug.id
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { date_time, log_type, friends_involved, players_killed, notes, evidence_url } = body

    if (!date_time || !log_type || !friends_involved || !players_killed) {
      return NextResponse.json(
        { error: 'Date/time, log type, friends involved, and players killed are required' },
        { status: 400 }
      )
    }

    const { data: log, error } = await supabase
      .from('war_logs')
      .insert({
        war_id: warId,
        log_type: log_type || 'ATTACK',
        date_time,
        friends_involved,
        players_killed,
        notes: notes || null,
        evidence_url: evidence_url || null,
        submitted_by: user.id,
      })
      .select(`
        *,
        submitted_by_user:users!war_logs_submitted_by_fkey(username, discord_id, avatar)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('Error creating war log:', error)
    return NextResponse.json(
      { error: 'Failed to create war log' },
      { status: 500 }
    )
  }
}
