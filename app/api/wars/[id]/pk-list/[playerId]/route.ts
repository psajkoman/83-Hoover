import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Remove player from PK list (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse the playerId which is in format: {faction}-{playerName}
    const [faction, ...nameParts] = playerId.split('-')
    const playerName = nameParts.join('-') // In case the name contains hyphens
    
    // First, find the player by name and faction
    const { data: player, error: findError } = await supabase
      .from('player_kill_list')
      .select('id')
      .eq('player_name', playerName)
      .eq('faction', faction)
      .single()
      
    if (findError) throw findError
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Now delete using the found ID
    const { error } = await supabase
      .from('player_kill_list')
      .delete()
      .eq('id', player.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from PK list:', error)
    return NextResponse.json(
      { error: 'Failed to remove from PK list' },
      { status: 500 }
    )
  }
}
