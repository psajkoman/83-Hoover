import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendLeaveNotificationToDiscord, updateDiscordNickname } from '@/lib/discord'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const discordId = (session.user as any).discordId as string | undefined
    if (!discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current user's role
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, role, discord_id')
      .eq('discord_id', discordId)
      .single()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the leave record
    const { data: leave, error: leaveError } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('id', params.id)
      .single()

    if (leaveError || !leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    // Check if user is authorized (either admin or the person who requested the leave)
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(currentUser.role || '')
    const isLeaveOwner = leave.requested_for_discord_id === discordId
    
    if (!isAdmin && !isLeaveOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the leave status to RETURNED instead of deleting it
    const { error: updateError } = await supabaseAdmin
      .from('leaves')
      .update({
        status: 'RETURNED',
        ended_by: currentUser.id,
        ended_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating leave status:', updateError)
      return NextResponse.json({ error: 'Failed to update leave status' }, { status: 500 })
    }

    // Update Discord nickname when leave is completed
    if (leave.requested_for_discord_id) {
      try {
        // Get the user's current display name from the database
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('display_name')
          .eq('discord_id', leave.requested_for_discord_id)
          .single();

        if (!userError && user?.display_name && user.display_name.includes('[LOA]')) {
          // Remove [LOA] from the display name
          const newNickname = user.display_name.replace(/\s*\[LOA\]\s*$/, '').trim();
          
          if (newNickname) {  // Only update if we have a valid name after removing [LOA]
            const success = await updateDiscordNickname(leave.requested_for_discord_id, newNickname);
            
            if (success) {
              // Update the display name in the database
              await supabaseAdmin
                .from('users')
                .update({ display_name: newNickname })
                .eq('discord_id', leave.requested_for_discord_id);
            }
          }
        }
      } catch (error) {
        console.error('[LOA] Failed to update Discord nickname:', error)
        // Continue even if nickname update fails
      }
    }

    // Send Discord notification to delete the embed post for RETURNED status
    try {
      const result = await sendLeaveNotificationToDiscord('RETURNED', {
        id: leave.id,
        requested_for_name: leave.requested_for_name,
        requested_for_discord_id: leave.requested_for_discord_id || null,
        start_date: leave.start_date,
        end_date: leave.end_date,
        note: leave.note || null,
        status: 'RETURNED',
        created_at: leave.created_at || null,
        decided_by: currentUser.id ? currentUser.discord_id || null : null,
        decided_at: leave.decided_at || null,
        decision_note: 'Leave ended',
        created_by: { username: session.user?.name || 'Unknown', displayName: session.user?.name || 'Unknown' },
        discord_message_id: (leave as any)?.discord_message_id || null,
        discord_channel_id: (leave as any)?.discord_channel_id || null
      });
      
      if (!result.ok && result.messageId !== 'skipped') {
        console.error('Failed to delete Discord LOA message:', result.error);
      }
    } catch (error) {
      console.error('Failed to send Discord notification for ended leave:', error)
      // Continue even if Discord deletion fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ending LOA:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
