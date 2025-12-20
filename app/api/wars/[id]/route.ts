import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUuid } from '@/lib/warSlug'
import { deleteWarFromDiscord, updateWarInDiscord } from '@/lib/discord'

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

    const warQuery = supabase
      .from('faction_wars')
      .select(`
        *,
        started_by_user:users!faction_wars_started_by_fkey(username, discord_id)
      `)

    const { data: war, error } = await (isUuid(id)
      ? warQuery.eq('id', warId)
      : warQuery.eq('slug', id)
    ).single()

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

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    // Handle case where user.role might be null
    const userRole = user?.role || 'MEMBER' // Default to 'MEMBER' if role is null/undefined
    if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, war_type, war_level, enemy_faction } = body

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'ENDED') {
        updateData.ended_at = new Date().toISOString()
      }
    }

    if (war_type) updateData.war_type = war_type
    
    // If enemy_faction is being updated, generate a new slug
    if (enemy_faction) {
      // Fetch the war to get the started_at date
      const { data: war } = await supabase
        .from('faction_wars')
        .select('started_at')
        .eq('id', warId)
        .single()
        
      const date = new Date(war?.started_at || new Date().toISOString())
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
      
      const slug = `${enemy_faction
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${dateStr}`
        
      updateData.enemy_faction = enemy_faction
      updateData.slug = slug
    }
    
    // If trying to set war to non-lethal, check for existing kills first
    if (war_level === 'NON_LETHAL') {
      const { count: killCount } = await supabase
        .from('war_logs')
        .select('*', { count: 'exact', head: true })
        .eq('war_id', warId)
        .not('players_killed', 'is', null)
        .not('players_killed', 'eq', '{}')

      if (killCount && killCount > 0) {
        return NextResponse.json(
          { error: 'Cannot set war to non-lethal because it has recorded kills' },
          { status: 400 }
        )
      }
    }
    
    if (war_level) updateData.war_level = war_level

    const { data: war, error } = await supabase
      .from('faction_wars')
      .update(updateData)
      .eq('id', warId)
      .select()
      .single()

    if (error) throw error

    if (war) {
      const messageId = (war as any).discord_message_id as string | null

      if (status === 'ENDED' && messageId) {
        try {
          await deleteWarFromDiscord(messageId)
        } catch (e) {
          console.warn('Failed to delete current war embed from Discord:', e)
        }

        try {
          await supabase
            .from('faction_wars')
            .update({ discord_message_id: null, discord_channel_id: null } as any)
            .eq('id', warId)
        } catch (e) {
          console.warn('Failed to clear Discord fields for ended war:', e)
        }
      } else if (messageId) {
        try {
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

          const { data: lastDefense } = await supabase
            .from('war_logs')
            .select('*')
            .eq('war_id', warId)
            .eq('log_type', 'DEFENSE')
            .order('date_time', { ascending: false })
            .limit(1)
            .single();

          await updateWarInDiscord(messageId, {
            id: (war as any).id,
            slug: (war as any).slug,
            enemy_faction: (war as any).enemy_faction,
            war_level: (war as any).war_level,
            war_type: (war as any).war_type,
            started_at: (war as any).started_at,
            regulations: (war as any).regulations,
            scoreboard: { kills, deaths },
            siteUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL,
            lastDefense: lastDefense || null
          })
        } catch (error) {
          console.error('Failed to update war in Discord:', error)
          // Don't fail the request if Discord update fails
        }
      }

      return NextResponse.json({ war })
    }

    return NextResponse.json({ war })
  } catch (error) {
    console.error('Error updating war:', error)
    return NextResponse.json(
      { error: 'Failed to update war' },
      { status: 500 }
    )
  }
}
