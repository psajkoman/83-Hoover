import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUuid } from '@/lib/warSlug'
import { resolveDiscordAuthor, sendEncounterLogToDiscord, updateWarInDiscord } from '@/lib/discord'
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

    // If hasKills query parameter is true, just check if there are any kills
    if (hasKillsQuery) {
      const { count, error: countError } = await supabase
        .from('war_logs')
        .select('*', { count: 'exact', head: true })
        .eq('war_id', warId)
        .not('players_killed', 'is', null)
        .not('players_killed', 'eq', '{}')

      if (countError) throw countError
      
      return NextResponse.json({ hasKills: (count || 0) > 0 })
    }

    // Otherwise, return the full logs
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
    const { id } = params
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

    // Get user info including display name (nickname or username)
    const discordId = (session.user as any).discordId
    if (!discordId) {
      console.error('No discordId found in session:', { session })
      return NextResponse.json({ error: 'Discord ID not found in session' }, { status: 400 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('discord_id', discordId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user:', { 
        discordId,
        error: userError,
        sessionUser: session.user 
      })
      return NextResponse.json({ 
        error: 'User not found',
        details: 'No user found with the provided Discord ID',
        discordId
      }, { status: 404 })
    }

    const body = await request.json()
    const { date_time, log_type, members_involved, friends_involved, players_killed, notes, evidence_url } = body

    if (!date_time || !log_type || !members_involved) {
      return NextResponse.json(
        { error: 'Date/time, log type, and members involved are required' },
        { status: 400 }
      )
    }

    const membersArray = Array.isArray(members_involved) ? members_involved : []
    const friendsArray = Array.isArray(friends_involved) ? friends_involved : []
    const playersArray = Array.isArray(players_killed) ? players_killed : []

    // Determine if this is the first encounter (no previous logs)
    const { count: existingLogCount, error: existingLogCountError } = await supabase
      .from('war_logs')
      .select('*', { count: 'exact', head: true })
      .eq('war_id', warId)

    if (existingLogCountError) throw existingLogCountError
    const isFirstEncounter = (existingLogCount || 0) === 0

    // Determine if war already had kills recorded BEFORE this insert
    const { count: existingKillCount, error: existingKillCountError } = await supabase
      .from('war_logs')
      .select('*', { count: 'exact', head: true })
      .eq('war_id', warId)
      .or('players_killed.neq.{},friends_involved.neq.{}')

    if (existingKillCountError) {
      // Fallback: still allow log creation even if we can't compute kill state
      console.warn('Failed to check existing kills:', existingKillCountError)
    }
    const warHadKillsBefore = (existingKillCount || 0) > 0
    const encounterHasKills = friendsArray.length > 0 || playersArray.length > 0

    const displayName = user.display_name || session.user.name || session.user.username || 'Unknown User';
    
    const { data: log, error } = await supabase
      .from('war_logs')
      .insert({
        war_id: warId,
        log_type: log_type || 'ATTACK',
        date_time,
        members_involved: membersArray,
        friends_involved,
        players_killed,
        notes: notes || null,
        evidence_url: evidence_url || null,
        submitted_by: user.id,
        submitted_by_display_name: displayName,
      })
      .select(`
        *,
        submitted_by_user:users!war_logs_submitted_by_fkey(username, discord_id, avatar)
      `)
      .single()

    if (error) throw error

    // Compute war level change (NON_LETHAL -> LETHAL) ONLY if kills are present
    let warLevelChangedToLethal = false
    let currentWarLevel: string | null = null
    try {
      const { data: warRow, error: warRowError } = await supabase
        .from('faction_wars')
        .select('war_level, enemy_faction, started_at, slug, war_type, regulations, discord_message_id')
        .eq('id', warId)
        .single()

      if (warRowError) throw warRowError

      currentWarLevel = (warRow as any)?.war_level || null

      if (currentWarLevel !== 'LETHAL' && currentWarLevel !== 'NON_LETHAL') {
        // Normalize any legacy values.
        currentWarLevel = 'NON_LETHAL'
      }

      if (currentWarLevel !== 'LETHAL' && !warHadKillsBefore && encounterHasKills) {
        const { error: updateError } = await supabase
          .from('faction_wars')
          .update({ war_level: 'LETHAL' })
          .eq('id', warId)

        if (!updateError) {
          warLevelChangedToLethal = true
          currentWarLevel = 'LETHAL'
        }
      }

      // Send to Discord and persist discord message id
      try {
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
        const warUrl = origin
          ? `${origin.replace(/\/$/, '')}/wars/${(warRow as any)?.slug || warId}`
          : undefined
        const embedTitle = `${(log_type || 'ATTACK') === 'ATTACK' ? 'Attack on' : 'Defense from'} ${(warRow as any)?.enemy_faction || 'Unknown Faction'}`
        let embedDescription = `${formatServerTime(date_time)}`

        const discordResult = await sendEncounterLogToDiscord((log_type || 'ATTACK') === 'ATTACK' ? 'ATTACK' : 'DEFENSE', {
          title: embedTitle,
          description: embedDescription,
          timestamp: date_time ? new Date(date_time) : undefined,
          notes: notes || undefined,
          evidence_url: evidence_url || undefined,
          members_involved: membersArray,
          friends_killed: friendsArray,
          enemies_killed: playersArray,
          war_name: (warRow as any)?.enemy_faction,
          war_url: warUrl,
          author: await resolveDiscordAuthor(
            (log as any)?.submitted_by_user?.discord_id,
            (log as any)?.submitted_by_user?.username || 'System'
          ),
        })

        if (discordResult?.ok && discordResult.messageId) {
          await supabase
            .from('war_logs')
            .update({
              discord_message_id: discordResult.messageId,
              discord_channel_id: discordResult.channelId || null,
            })
            .eq('id', (log as any).id)
        }
      } catch (e) {
        console.warn('Failed to send war log to Discord:', e)
      }

      // Update current war embed scoreboard (best effort)
      try {
        const messageId = (warRow as any)?.discord_message_id as string | null
        if (messageId) {
          const { data: logs } = await supabase
            .from('war_logs')
            .select('players_killed, friends_involved')
            .eq('war_id', warId)

          const kills = (logs || []).reduce(
            (sum: number, l: any) => sum + (Array.isArray(l.players_killed) ? l.players_killed.length : 0),
            0
          )
          const deaths = (logs || []).reduce(
            (sum: number, l: any) => sum + (Array.isArray(l.friends_involved) ? l.friends_involved.length : 0),
            0
          )

          const [
            { data: lastDefense },
            { data: lastAttack }
          ] = await Promise.all([
            supabase
              .from('war_logs')
              .select('*')
              .eq('war_id', warId)
              .eq('log_type', 'DEFENSE')
              .order('date_time', { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from('war_logs')
              .select('*')
              .eq('war_id', warId)
              .eq('log_type', 'ATTACK')
              .order('date_time', { ascending: false })
              .limit(1)
              .single()
          ]);

          await updateWarInDiscord(messageId, {
            id: warId,
            slug: (warRow as any)?.slug,
            enemy_faction: (warRow as any)?.enemy_faction,
            war_level: currentWarLevel || (warRow as any)?.war_level,
            war_type: (warRow as any)?.war_type,
            started_at: (warRow as any)?.started_at,
            regulations: (warRow as any)?.regulations,
            scoreboard: { kills, deaths },
            siteUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL,
            lastDefense: lastDefense || null,
            lastAttack: lastAttack || null
          })
        }
      } catch (e) {
        console.warn('Failed to update current war embed after log create:', e)
      }
    } catch (e) {
      console.warn('Failed to compute/update war level:', e)
    }

    return NextResponse.json(
      {
        log,
        isFirstEncounter,
        currentWarLevel,
        warLevelChangedToLethal,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating war log:', error)
    return NextResponse.json(
      { error: 'Failed to create war log' },
      { status: 500 }
    )
  }
}
