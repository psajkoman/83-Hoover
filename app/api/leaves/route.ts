import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendLeaveNotificationToDiscord, resolveDiscordAuthor, updateDiscordNickname } from '@/lib/discord'

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
    const scope = searchParams.get('scope') || 'default'

    let query = supabaseAdmin
      .from('leaves')
      .select('*')
      .order('created_at', { ascending: false })

    if (scope === 'all') {
      // Show all leaves for admins
      if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else if (scope === 'pending') {
      // Legacy page: treat pending as "active/away" leaves (admin-only)
      if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('status', 'AWAY')
    } else if (scope === 'my') {
      // For 'my' scope, show leaves where the user is the requested_for
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('discord_id')
        .eq('id', user.id)
        .single()
      
      if (userProfile?.discord_id) {
        query = query.eq('requested_for_discord_id', userProfile.discord_id)
      } else {
        // Fallback to name matching if no Discord ID is found
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        
        if (userData?.username) {
          query = query.eq('requested_for_name', userData.username)
        } else {
          return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }
      }
    } else {
      // Default case: only show leaves created by the current user
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
            status: 'DENIED',
            created_by: creator.id,
            created_by_discord_id: creator.discord_id || null,
            decided_at: new Date().toISOString(),
            decided_by: null,
            decision_note: 'Auto-denied: user is inactive',
            admin_override,
          } as any) // Type assertion for status
          .select('*')
          .single()

        if (insertError || !leave) {
          return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
        }

        // Update Discord nickname and send notification for new leave
        try {
          const creatorInfo = await resolveDiscordAuthor(creator.discord_id || undefined, session.user?.name || 'Unknown')
          
          // Update Discord nickname if the user has a Discord ID
          if (requested_for_discord_id) {
            try {
              // Get the user's current display name from the database
              const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('display_name')
                .eq('discord_id', requested_for_discord_id)
                .single()

              if (!userError && user?.display_name) {
                // Only update if [LOA] is not already in the name
                if (!user.display_name.includes('[LOA]')) {
                  // Add [LOA] to the display name
                  const newNickname = `${user.display_name} [LOA]`.trim()
                  const success = await updateDiscordNickname(requested_for_discord_id, newNickname)
                  
                  // Update the display name in the database if Discord update was successful
                  if (success) {
                    await supabaseAdmin
                      .from('users')
                      .update({ display_name: newNickname })
                      .eq('discord_id', requested_for_discord_id)
                  }
                }
              }
            } catch (error) {
              console.error('Failed to update Discord nickname:', error)
              // Continue even if nickname update fails
            }
          }
          
          const result = await sendLeaveNotificationToDiscord('DENIED', {
            id: leave.id,
            requested_for_name: leave.requested_for_name || '',
            requested_for_discord_id: leave.requested_for_discord_id || null,
            start_date: leave.start_date,
            end_date: leave.end_date,
            note: leave.note || null,
            status: 'DENIED',
            created_at: leave.created_at || null,
            decided_at: leave.decided_at || null,
            decision_note: leave.decision_note || 'Auto-denied: user is inactive',
            created_by: creatorInfo
          })
          
          if (!result.ok && result.messageId !== 'skipped') {
            console.error('Failed to send Discord notification for auto-denied leave:', result.error)
          }
        } catch (discordError) {
          console.error('Failed to process Discord operations for auto-denied leave:', discordError)
          // Don't fail the request if Discord operations fail
        }

        return NextResponse.json({ leave }, { status: 201 })
      }

      // Check for overlapping active leaves
      if (requested_for_discord_id) {
        const { data: activeLeaves, error: activeLeavesError } = await supabaseAdmin
          .from('leaves')
          .select('id, start_date, end_date')
          .eq('requested_for_discord_id', requested_for_discord_id)
          .eq('status', 'AWAY')
          .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

        if (activeLeavesError) {
          console.error('Error checking for overlapping leaves:', activeLeavesError);
          return NextResponse.json({ error: 'Failed to validate overlapping leaves' }, { status: 500 });
        }

        const hasOverlap = (activeLeaves || []).some((l) => 
          overlaps(start_date, end_date, l.start_date, l.end_date)
        );
        
        if (hasOverlap) {
          return NextResponse.json({ 
            error: 'This user already has an overlapping active leave' 
          }, { status: 409 });
        }
      }

      // Create leave with AWAY status (auto-approved)
      const { data: leave, error } = await supabaseAdmin
        .from('leaves')
        .insert({
          requested_for_name,
          requested_for_discord_id,
          start_date: start_date,
          end_date: end_date,
          note,
          status: 'AWAY',
          created_by: creator.id,
          created_by_discord_id: creator.discord_id || null,
          admin_override: admin_override && isAdminRole(creator.role),
          decided_by: creator.id, // Set the creator as the decider
          decided_at: new Date().toISOString(), // Set the creation time
          decision_note: 'Automatically created as AWAY' // Add a note
        } as any) // Type assertion to handle the status type
        .select()
        .single()

      if (error || !leave) {
        console.error('Error creating leave:', error)
        return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
      }

      // Send Discord notification for new leave and update nickname
      try {
        const creatorInfo = await resolveDiscordAuthor(creator.discord_id || undefined, session.user?.name || 'Unknown')

        // Update Discord nickname if the user has a Discord ID
        if (leave.requested_for_discord_id) {
          try {
            // Get the user's current display name from the database
            const { data: user, error: userError } = await supabaseAdmin
              .from('users')
              .select('display_name')
              .eq('discord_id', leave.requested_for_discord_id)
              .single();

            if (!userError && user?.display_name && !user.display_name.includes('[LOA]')) {
              const newNickname = `${user.display_name} [LOA]`.trim();
              const success = await updateDiscordNickname(leave.requested_for_discord_id, newNickname);
              
              if (success) {
                // Update the display name in the database
                await supabaseAdmin
                  .from('users')
                  .update({ display_name: newNickname })
                  .eq('discord_id', leave.requested_for_discord_id);
              }
            }
          } catch (error) {
            console.error('[LOA] Failed to update Discord nickname:', error)
            // Continue even if nickname update fails
          }
        }

        const discordResult = await sendLeaveNotificationToDiscord('AWAY', {
          id: leave.id,
          requested_for_name: leave.requested_for_name,
          requested_for_discord_id: leave.requested_for_discord_id || null,
          start_date: leave.start_date,
          end_date: leave.end_date,
          note: leave.note || null,
          status: 'AWAY',
          created_at: leave.created_at || null,
          decided_by: creatorInfo.displayName || creatorInfo.username || null,
          decided_at: leave.decided_at || null,
          decision_note: 'Automatically created',
          created_by: creatorInfo
        })

        if (discordResult?.ok && discordResult.messageId && discordResult.messageId !== 'skipped') {
          await supabaseAdmin
            .from('leaves')
            .update({
              discord_message_id: discordResult.messageId,
              discord_channel_id: discordResult.channelId || null,
            } as any)
            .eq('id', leave.id)
        }
      } catch (discordError) {
        console.error('Failed to send Discord notification for submitted leave:', discordError)
        // Don't fail the request if Discord notification fails
      }

      return NextResponse.json({ leave }, { status: 201 })
    }

    // Create leave with AWAY status (auto-approved)
    const { data: leave, error } = await supabaseAdmin
      .from('leaves')
      .insert({
        requested_for_name,
        requested_for_discord_id,
        start_date: start_date,
        end_date: end_date,
        note,
        status: 'AWAY',
        created_by: creator.id,
        created_by_discord_id: creator.discord_id || null,
        admin_override: admin_override && isAdminRole(creator.role),
        decided_by: creator.id, // Set the creator as the decider
        decided_at: new Date().toISOString(), // Set the creation time
        decision_note: 'Automatically created as AWAY' // Add a note
      } as any) // Type assertion to handle the status type
      .select()
      .single()

    if (error || !leave) {
      console.error('Error creating leave:', error)
      return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 })
    }

    // Update Discord nickname and send notification for new leave
    try {
      const creatorInfo = await resolveDiscordAuthor(creator.discord_id || undefined, session.user?.name || 'Unknown')

      // Update Discord nickname if the user has a Discord ID
      if (requested_for_discord_id) {
        try {
          // Get the user's current display name from the database
          const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('display_name')
            .eq('discord_id', requested_for_discord_id)
            .single();

          if (!userError && user?.display_name && !user.display_name.includes('[LOA]')) {
            const newNickname = `${user.display_name} [LOA]`.trim();
            const success = await updateDiscordNickname(requested_for_discord_id, newNickname);
            
            if (success) {
              // Update the display name in the database
              await supabaseAdmin
                .from('users')
                .update({ display_name: newNickname })
                .eq('discord_id', requested_for_discord_id);
            }
          }
        } catch (error) {
          console.error('[LOA] Failed to update Discord nickname:', error)
          // Continue even if nickname update fails
        }
      }

      const discordResult = await sendLeaveNotificationToDiscord('AWAY', {
        id: leave.id,
        requested_for_name: leave.requested_for_name,
        requested_for_discord_id: leave.requested_for_discord_id || null,
        start_date: leave.start_date,
        end_date: leave.end_date,
        note: leave.note || null,
        status: 'AWAY',
        created_at: leave.created_at || null,
        decided_by: creatorInfo.displayName || creatorInfo.username || null,
        decided_at: leave.decided_at || null,
        decision_note: 'Automatically created',
        created_by: creatorInfo
      })

      if (discordResult?.ok && discordResult.messageId && discordResult.messageId !== 'skipped') {
        await supabaseAdmin
          .from('leaves')
          .update({
            discord_message_id: discordResult.messageId,
            discord_channel_id: discordResult.channelId || null,
          } as any)
          .eq('id', leave.id)
      }
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
