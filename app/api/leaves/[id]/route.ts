import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendLeaveNotificationToDiscord, resolveDiscordAuthor } from '@/lib/discord'

const isAdminRole = (role: string | null | undefined) =>
  !!role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const discordId = (session.user as any).discordId as string | undefined
    if (!discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabaseAdmin
      .from('users')
      .select('id, role, discord_id')
      .eq('discord_id', discordId)
      .single()

    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: leave, error } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    if (!isAdminRole(actor.role) && leave.created_by !== actor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ leave })
  } catch (error) {
    console.error('Error fetching leave:', error)
    return NextResponse.json({ error: 'Failed to fetch leave' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const discordId = (session.user as any).discordId as string | undefined
    if (!discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabaseAdmin
      .from('users')
      .select('id, role, discord_id')
      .eq('discord_id', discordId)
      .single()

    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: leave, error: leaveError } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('id', params.id)
      .single()

    if (leaveError || !leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending leaves can be decided' }, { status: 400 })
    }

    const body = await request.json()
    const action = (body?.action as string | undefined)?.toUpperCase()
    const decision_note = (body?.decision_note as string | undefined) || null

    if (!action || !['APPROVE', 'DENY'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'APPROVE') {
      if (leave.requested_for_discord_id) {
        const active = await isDiscordMemberActive(leave.requested_for_discord_id)
        if (!active) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from('leaves')
            .update({
              status: 'AUTO_DENIED',
              decided_by: actor.id,
              decided_at: new Date().toISOString(),
              decision_note: decision_note || 'Auto-denied: user is inactive',
            })
            .eq('id', leave.id)
            .select('*')
            .single()

          if (updateError || !updated) {
            return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
          }

          // Send Discord notification for auto-denied leave
          try {
            const deciderInfo = await resolveDiscordAuthor(actor.discord_id || undefined, session.user?.name || 'Unknown')
            
            const result = await sendLeaveNotificationToDiscord('AUTO_DENIED', {
              id: updated.id,
              requested_for_name: updated.requested_for_name,
              requested_for_discord_id: updated.requested_for_discord_id,
              start_date: updated.start_date,
              end_date: updated.end_date,
              note: updated.note,
              status: updated.status,
              created_at: updated.created_at,
              decided_by: deciderInfo.displayName || deciderInfo.username,
              decided_at: updated.decided_at,
              decision_note: updated.decision_note,
            })
            
            if (!result.ok && result.messageId !== 'skipped') {
              console.error('Failed to send Discord notification for auto-denied leave:', result.error)
            }
          } catch (discordError) {
            console.error('Failed to send Discord notification for auto-denied leave:', discordError)
            // Don't fail the request if Discord notification fails
          }

          return NextResponse.json({ leave: updated })
        }

        const { data: approvedLeaves, error: approvedError } = await supabaseAdmin
          .from('leaves')
          .select('id, start_date, end_date')
          .eq('requested_for_discord_id', leave.requested_for_discord_id)
          .eq('status', 'APPROVED')

        if (approvedError) {
          return NextResponse.json({ error: 'Failed to validate overlapping leaves' }, { status: 500 })
        }

        const hasOverlap = (approvedLeaves || [])
          .filter((l) => l.id !== leave.id)
          .some((l) => overlaps(leave.start_date, leave.end_date, l.start_date, l.end_date))

        if (hasOverlap) {
          return NextResponse.json({ error: 'This user already has an overlapping approved leave' }, { status: 409 })
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('leaves')
        .update({
          status: 'APPROVED',
          decided_by: actor.id,
          decided_at: new Date().toISOString(),
          decision_note,
        })
        .eq('id', leave.id)
        .select('*')
        .single()

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
      }

      // Send Discord notification for approved leave
      try {
        const deciderInfo = await resolveDiscordAuthor(actor.discord_id || undefined, session.user?.name || 'Unknown')
        
        await sendLeaveNotificationToDiscord('APPROVED', {
          id: updated.id,
          requested_for_name: updated.requested_for_name,
          requested_for_discord_id: updated.requested_for_discord_id,
          start_date: updated.start_date,
          end_date: updated.end_date,
          note: updated.note,
          status: updated.status,
          created_at: updated.created_at,
          decided_by: deciderInfo.displayName || deciderInfo.username,
          decided_at: updated.decided_at,
          decision_note: updated.decision_note,
        })
      } catch (discordError) {
        console.error('Failed to send Discord notification for approved leave:', discordError)
        // Don't fail the request if Discord notification fails
      }

      return NextResponse.json({ leave: updated })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('leaves')
      .update({
        status: 'DENIED',
        decided_by: actor.id,
        decided_at: new Date().toISOString(),
        decision_note,
      })
      .eq('id', leave.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
    }

    // Send Discord notification for denied leave
    try {
      const deciderInfo = await resolveDiscordAuthor(actor.discord_id || undefined, session.user?.name || 'Unknown')
      
      const result = await sendLeaveNotificationToDiscord('DENIED', {
        id: updated.id,
        requested_for_name: updated.requested_for_name,
        requested_for_discord_id: updated.requested_for_discord_id,
        start_date: updated.start_date,
        end_date: updated.end_date,
        note: updated.note,
        status: updated.status,
        created_at: updated.created_at,
        decided_by: deciderInfo.displayName || deciderInfo.username,
        decided_at: updated.decided_at,
        decision_note: updated.decision_note,
      })
      
      if (!result.ok && result.messageId !== 'skipped') {
        console.error('Failed to send Discord notification for denied leave:', result.error)
      }
    } catch (discordError) {
      console.error('Failed to send Discord notification for denied leave:', discordError)
      // Don't fail the request if Discord notification fails
    }

    return NextResponse.json({ leave: updated })
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
  }
}
