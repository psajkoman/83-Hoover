import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildEncounterWebhookPayload, deleteDiscordWebhookMessage, editDiscordWebhookMessage, resolveDiscordAuthor, updateWarInDiscord } from '@/lib/discord'
import { formatServerTime } from '@/lib/dateUtils'

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
    const { date_time, log_type, members_involved, friends_involved, players_killed, notes, evidence_url } = body

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

    // Update the log query to include created_at
    const { data: log } = await supabase
      .from('war_logs')
      .select('id, war_id, submitted_by, log_type, discord_message_id, created_at')
      .eq('id', logId)
      .single()

    const userRole = user?.role || 'MEMBER' // Default to 'MEMBER' if role is null/undefined
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)
    // const isOwner = log?.submitted_by === user.id

    // Add time check (24 hours in milliseconds)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    const logAge = Date.now() - new Date(log?.created_at || 0).getTime()
    const isOlderThan24Hours = logAge > TWENTY_FOUR_HOURS

    if (!isAdmin) {
      // if (!isOwner) {
      //   return NextResponse.json({ error: 'You can only edit your own logs' }, { status: 403 })
      // }
      if (isOlderThan24Hours) {
        return NextResponse.json(
          { error: 'Logs can only be edited within 24 hours of creation' }, 
          { status: 403 }
        )
      }
    }

    // Update the log
    const { data: updatedLog, error } = await supabase
      .from('war_logs')
      .update({
        date_time,
        log_type,
        members_involved,
        friends_involved,
        players_killed,
        notes,
        evidence_url,
        edited_by: user.id,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select('*')
      .single()

    if (error) throw error

    // Recompute war level downgrade if kills removed
    try {
      const warId = (log as any)?.war_id;
      if (warId) {
        const { data: war } = await supabase
          .from('faction_wars')
          .select('war_level, enemy_faction')
          .eq('id', warId)
          .single();
        if (war) {
          const hasKills = (friends_involved.length + players_killed.length) > 0;
          const currentLevel = war.war_level;
          // If war is not LETHAL and we're adding kills, upgrade to LETHAL
          if (currentLevel !== 'LETHAL' && hasKills) {
            await supabase
              .from('faction_wars')
              .update({ war_level: 'LETHAL' })
              .eq('id', warId);
          }
          // If war is LETHAL and we're removing all kills, downgrade to NON_LETHAL
          else if (currentLevel === 'LETHAL' && !hasKills) {
            const { count: totalKills } = await supabase
              .from('war_logs')
              .select('*', { count: 'exact', head: true })
              .eq('war_id', warId)
              .or('players_killed.neq.{},friends_involved.neq.{}');
            if ((totalKills || 0) === 0) {
              await supabase
                .from('faction_wars')
                .update({ war_level: 'NON_LETHAL' })
                .eq('id', warId);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to recompute war level after edit:', e)
    }

    // Sync edit to Discord (edit same message)
    try {
      const messageId = (log as any)?.discord_message_id
      const effectiveType = ((updatedLog as any)?.log_type || (log as any)?.log_type || 'ATTACK') as 'ATTACK' | 'DEFENSE'
      if (messageId) {
        const warId = (log as any)?.war_id
        let warRow: any = null
        try {
          const { data } = await supabase
            .from('faction_wars')
            .select('enemy_faction, slug')
            .eq('id', warId)
            .single()
          warRow = data
        } catch {
          warRow = null
        }

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
        const warUrl = origin
          ? `${origin.replace(/\/$/, '')}/wars/${warRow?.slug || warId || id}`
          : undefined

        const embedTitle = `${(log_type || 'ATTACK') === 'ATTACK' ? 'Attack on' : 'Defense from'} ${(warRow as any)?.enemy_faction || 'Unknown Faction'}`
        let embedDescription = formatServerTime(date_time)

        const { webhookUrl, payload } = buildEncounterWebhookPayload(effectiveType, {
          title: embedTitle,
          description: embedDescription,
          timestamp: (updatedLog as any)?.date_time ? new Date((updatedLog as any).date_time) : undefined,
          notes: (updatedLog as any)?.notes || undefined,
          evidence_url: (updatedLog as any)?.evidence_url || undefined,
          members_involved: Array.isArray((updatedLog as any)?.members_involved) ? (updatedLog as any).members_involved : [],
          friends_killed: Array.isArray((updatedLog as any)?.friends_involved) ? (updatedLog as any).friends_involved : [],
          enemies_killed: Array.isArray((updatedLog as any)?.players_killed) ? (updatedLog as any).players_killed : [],
          war_name: warRow?.enemy_faction,
          war_url: warUrl,
          author: await resolveDiscordAuthor(
            (session.user as any)?.discordId,
            ((session?.user as any)?.name as string) || 'System'
          ),
        })

        await editDiscordWebhookMessage(webhookUrl, messageId, payload)
      }
    } catch (e) {
      console.warn('Failed to sync edited log to Discord:', e)
    }

    // Update current war embed scoreboard (best effort)
    try {
      const warId = (log as any)?.war_id
      if (warId) {
        const { data: warRow } = await supabase
          .from('faction_wars')
          .select('discord_message_id, enemy_faction, slug, war_level, war_type, started_at, regulations')
          .eq('id', warId)
          .single()

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
            war_level: (warRow as any)?.war_level,
            war_type: (warRow as any)?.war_type,
            started_at: (warRow as any)?.started_at,
            regulations: (warRow as any)?.regulations,
            scoreboard: { kills, deaths },
            siteUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL,
            lastDefense: lastDefense || null,
            lastAttack: lastAttack || null
          })
        }
      }
    } catch (e) {
      console.warn('Failed to update current war embed after log edit:', e)
    }

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
        
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    const discordId = (session.user as any).discordId || (session.user as any).id

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

    // Only admins can delete logs
    const userRole = user?.role || 'MEMBER' // Default to 'MEMBER' if role is null/undefined
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can delete logs' }, { status: 403 })
    }

    // Fetch discord message info BEFORE deletion
    const { data: existingLog } = await supabase
      .from('war_logs')
      .select('id, war_id, log_type, discord_message_id')
      .eq('id', logId)
      .single()

    const { error } = await supabase
      .from('war_logs')
      .delete()
      .eq('id', logId)

    if (error) {
      console.error('Delete error:', error)
      throw error
    }

    // Delete Discord message (best effort)
    try {
      const messageId = (existingLog as any)?.discord_message_id
      const effectiveType = ((existingLog as any)?.log_type || 'ATTACK') as 'ATTACK' | 'DEFENSE'
      if (messageId) {
        const { webhookUrl } = buildEncounterWebhookPayload(effectiveType, {
          title: 'Deleted encounter',
          description: 'Deleted encounter',
        })
        await deleteDiscordWebhookMessage(webhookUrl, messageId)
      }
    } catch (e) {
      console.warn('Failed to delete Discord message for war log:', e)
    }

    // Recompute war level downgrade if kills removed
    try {
      const warId = (existingLog as any)?.war_id
      if (warId) {
        const { count: killCount } = await supabase
          .from('war_logs')
          .select('*', { count: 'exact', head: true })
          .eq('war_id', warId)
          .or('players_killed.neq.{},friends_involved.neq.{}')

        if ((killCount || 0) === 0) {
          await supabase
            .from('faction_wars')
            .update({ war_level: 'NON_LETHAL' })
            .eq('id', warId)
        }
      }
    } catch (e) {
      console.warn('Failed to recompute war level after delete:', e)
    }

    // Update current war embed scoreboard (best effort)
    try {
      const warId = (existingLog as any)?.war_id
      if (warId) {
        const { data: warRow } = await supabase
          .from('faction_wars')
          .select('discord_message_id, enemy_faction, slug, war_level, war_type, started_at, regulations')
          .eq('id', warId)
          .single()

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

          await updateWarInDiscord(messageId, {
            id: warId,
            slug: (warRow as any)?.slug,
            enemy_faction: (warRow as any)?.enemy_faction,
            war_level: (warRow as any)?.war_level,
            war_type: (warRow as any)?.war_type,
            started_at: (warRow as any)?.started_at,
            regulations: (warRow as any)?.regulations,
            scoreboard: { kills, deaths },
            siteUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL,
          })
        }
      }
    } catch (e) {
      console.warn('Failed to update current war embed after log delete:', e)
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
