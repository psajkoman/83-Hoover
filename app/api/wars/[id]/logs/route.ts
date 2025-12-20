import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUuid } from '@/lib/warSlug'
import {
  resolveDiscordAuthor,
  sendEncounterLogToDiscord,
} from '@/lib/discord'
import { formatServerTime } from '@/lib/dateUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const hasKillsQuery = searchParams.get('hasKills') === 'true'

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore
    } as any)

    let warId = id

    if (!isUuid(id)) {
      const { data, error } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (error) throw error
      if (!data) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }

      warId = data.id
    }

    if (hasKillsQuery) {
      const { count, error } = await supabase
        .from('war_logs')
        .select('*', { count: 'exact', head: true })
        .eq('war_id', warId)
        .not('players_killed', 'is', null)
        .not('players_killed', 'eq', '{}')

      if (error) throw error

      return NextResponse.json({ hasKills: (count || 0) > 0 })
    }

    const { data: logs, error } = await supabase
      .from('war_logs')
      .select(`
        *,
        members_involved,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore
    } as any)

    let warId = params.id

    if (!isUuid(warId)) {
      const { data, error } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', warId)
        .single()

      if (error) throw error
      if (!data) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }

      warId = data.id
    }

    const discordId = (session.user as any).discordId
    if (!discordId) {
      return NextResponse.json({ error: 'Missing Discord ID' }, { status: 400 })
    }

    // First get the user
    const { data: user } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('discord_id', discordId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then get the war details
    const { data: war } = await supabase
      .from('faction_wars')
      .select('id, status, started_by')
      .eq('id', warId)
      .single()

    if (!war) {
      return NextResponse.json({ error: 'War not found' }, { status: 404 })
    }

    // Check if the current user is the creator of the war
    const isCreator = war.started_by === user.id

    // Only allow adding logs to ACTIVE wars or PENDING wars where the user is the creator
    if (war.status !== 'ACTIVE' && !(war.status === 'PENDING' && isCreator)) {
      return NextResponse.json(
        { error: 'Cannot add logs to this war' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      date_time,
      log_type,
      members_involved,
      friends_involved,
      players_killed,
      notes,
      evidence_url
    } = body

    if (!date_time || !log_type || !members_involved) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const membersArray = Array.isArray(members_involved) ? members_involved : []
    const friendsArray = Array.isArray(friends_involved) ? friends_involved : []
    const playersArray = Array.isArray(players_killed) ? players_killed : []

    const displayName =
      user.display_name || session.user.name || session.user.username || 'Unknown'

    const { data: log, error: insertError } = await supabase
      .from('war_logs')
      .insert({
        war_id: warId,
        log_type,
        date_time,
        members_involved: membersArray,
        friends_involved: friendsArray,
        players_killed: playersArray,
        notes: notes || null,
        evidence_url: evidence_url || null,
        submitted_by: user.id,
        submitted_by_display_name: displayName
      })
      .select(`
        *,
        submitted_by_user:users!war_logs_submitted_by_fkey(username, discord_id)
      `)
      .single()

    if (insertError || !log) {
      console.error('Error creating war log:', insertError)
      return NextResponse.json(
        { error: 'Failed to create war log' },
        { status: 500 }
      )
    }

    const { data: warRow } = await supabase
      .from('faction_wars')
      .select('enemy_faction, slug, discord_message_id')
      .eq('id', warId)
      .single()

    if (war.status === 'ACTIVE') {
      const origin =
        request.headers.get('origin') ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL

      const author = await resolveDiscordAuthor(
        log.submitted_by_user?.discord_id,
        log.submitted_by_user?.username || 'System'
      )

      await sendEncounterLogToDiscord(log_type, {
        title: `${log_type === 'ATTACK' ? 'Attack on' : 'Defense from'} ${warRow?.enemy_faction}`,
        description: formatServerTime(date_time),
        timestamp: new Date(date_time),
        notes: notes || undefined,
        evidence_url: evidence_url || undefined,
        members_involved: membersArray,
        friends_killed: friendsArray,
        enemies_killed: playersArray,
        war_url: origin ? `${origin}/wars/${warRow?.slug}` : undefined,
        author: {
          username: author.username,
          displayName: author.displayName,
          avatar: author.avatar
        }
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating war log:', error)
    return NextResponse.json(
      { error: 'Failed to create war log' },
      { status: 500 }
    )
  }
}
