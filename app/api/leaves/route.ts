import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendLeaveNotificationToDiscord, resolveDiscordAuthor } from '@/lib/discord'

const MAX_LEAVE_DAYS = 30

const isAdminRole = (role: string | null | undefined) =>
  !!role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)

const parseIsoDateOnly = (value: string): Date | null => {
  if (!value) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const diffDaysInclusive = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

const overlaps = (startA: string, endA: string, startB: string, endB: string) => {
  return startA <= endB && endA >= startB
}

async function isDiscordMemberActive(discordId: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !botToken) return true

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      cache: 'no-store',
    })

    return res.ok
  } catch {
    return true
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const discordId = (session.user as any).discordId as string | undefined
    if (!discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('discord_id', discordId)
      .single()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'my'

    let query = supabaseAdmin
      .from('leaves')
      .select('*')
      .order('created_at', { ascending: false })

    if (scope === 'pending') {
      if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('status', 'PENDING')
    } else if (scope === 'all') {
      if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      query = query.eq('created_by', user.id)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to fetch leaves' }, { status: 500 })
    }

    return NextResponse.json({ leaves: data || [] })
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get the user's Discord ID from the session
    const discordId = (session.user as any).discordId
    if (!discordId) {
      return NextResponse.json({ 
        error: 'Discord ID not found. Please sign in again.' 
      }, { status: 400 })
    }

    // Get the creator's details from the database using Discord ID
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('users')
      .select('id, discord_id, role')
      .eq('discord_id', discordId)
      .single()

    if (creatorError || !creator) {
      console.error('Error fetching creator:', creatorError)
      return NextResponse.json({ 
        error: 'User not found. Please make sure your Discord account is properly linked.' 
      }, { status: 404 })
    }

    const body = await request.json()
    const requested_for_name = (body?.requested_for_name as string | undefined)?.trim()
    const requested_for_discord_id = (body?.requested_for_discord_id as string | undefined)?.trim() || null
    const start_date = body?.start_date as string | undefined
    const end_date = body?.end_date as string | undefined
    const note = (body?.note as string | undefined) || null
    const admin_override = !!body?.admin_override

    if (!requested_for_name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const start = parseIsoDateOnly(start_date)
    const end = parseIsoDateOnly(end_date)
    if (!start || !end) {
      return NextResponse.json({ error: 'Invalid start or end date' }, { status: 400 })
    }

    if (end.getTime() < start.getTime()) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
    }

    const durationDays = diffDaysInclusive(start, end)
    if (durationDays > MAX_LEAVE_DAYS && !(admin_override && isAdminRole(creator.role))) {
      return NextResponse.json({ error: `Max leave duration is ${MAX_LEAVE_DAYS} days` }, { status: 400 })
    }

    const today = new Date()
    const todayDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

    const isRetroactive = start.getTime() < todayDateOnly.getTime()
    if (isRetroactive && !(admin_override && isAdminRole(creator.role))) {
      return NextResponse.json({ error: 'Retroactive leaves require admin override' }, { status: 400 })
    }

    if (admin_override && !isAdminRole(creator.role)) {
      return NextResponse.json({ error: 'Admin override requires admin role' }, { status: 403 })
    }

    if (requested_for_discord_id) {
      const active = await isDiscordMemberActive(requested_for_discord_id)
      if (!active) {
        const { data: leave, error: insertError } = await supabaseAdmin
          .from('leaves')
          .insert({
            requested_for_name,
            requested_for_discord_id,
            start_date,
            end_date,
            note,
            status: 'AUTO_DENIED',
            created_by: creator.id,
            created_by_discord_id: creator.discord_id || null,
            decided_at: new Date().toISOString(),
            decided_by: null,
            decision_note: 'Auto-denied: user is inactive',
            admin_override,
          })
          .select('*')
          .single()

        if (insertError || !leave) {
          return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
        }

        // Send Discord notification for auto-denied leave
        try {
          const creatorInfo = await resolveDiscordAuthor(creator.discord_id || undefined, session.user?.name || 'Unknown')
          
          const result = await sendLeaveNotificationToDiscord('AUTO_DENIED', {
            id: leave.id,
            requested_for_name: leave.requested_for_name,
            requested_for_discord_id: leave.requested_for_discord_id,
            start_date: leave.start_date,
            end_date: leave.end_date,
            note: leave.note,
            status: leave.status,
            created_at: leave.created_at,
            decided_at: leave.decided_at,
            decision_note: leave.decision_note,
            created_by: creatorInfo
          })
          
          if (!result.ok && result.messageId !== 'skipped') {
            console.error('Failed to send Discord notification for auto-denied leave:', result.error)
          }
        } catch (discordError) {
          console.error('Failed to send Discord notification for auto-denied leave:', discordError)
          // Don't fail the request if Discord notification fails
        }

        return NextResponse.json({ leave }, { status: 201 })
      }

      const { data: approvedLeaves, error: approvedError } = await supabaseAdmin
        .from('leaves')
        .select('id, start_date, end_date')
        .eq('requested_for_discord_id', requested_for_discord_id)
        .eq('status', 'APPROVED')

      if (approvedError) {
        return NextResponse.json({ error: 'Failed to validate overlapping leaves' }, { status: 500 })
      }

      const hasOverlap = (approvedLeaves || []).some((l) => overlaps(start_date, end_date, l.start_date, l.end_date))
      if (hasOverlap) {
        return NextResponse.json({ error: 'This user already has an overlapping approved leave' }, { status: 409 })
      }
    }

    const { data: leave, error } = await supabaseAdmin
      .from('leaves')
      .insert({
        requested_for_name,
        requested_for_discord_id,
        start_date: start_date,
        end_date: end_date,
        note,
        status: 'PENDING',
        created_by: creator.id,
        created_by_discord_id: creator.discord_id || null,
        admin_override: admin_override && isAdminRole(creator.role),
      })
      .select()
      .single()

    if (error || !leave) {
      console.error('Error creating leave:', error)
      return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
    }

    // Send Discord notification for submitted leave
    try {
      // Get the creator's Discord display name
      const creatorInfo = await resolveDiscordAuthor(creator.discord_id || undefined, session.user?.name || 'Unknown')
      
      await sendLeaveNotificationToDiscord('SUBMITTED', {
        id: leave.id,
        requested_for_name: leave.requested_for_name,
        requested_for_discord_id: leave.requested_for_discord_id,
        start_date: leave.start_date,
        end_date: leave.end_date,
        note: leave.note,
        status: leave.status,
        created_at: leave.created_at,
        created_by: creatorInfo
      })
    } catch (discordError) {
      console.error('Failed to send Discord notification for submitted leave:', discordError)
      // Don't fail the request if Discord notification fails
    }

    return NextResponse.json({ leave }, { status: 201 })
  } catch (error) {
    console.error('Error creating leave:', error)
    return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
  }
}
