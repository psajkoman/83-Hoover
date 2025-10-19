import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
    
    const { data: zones, error } = await supabase
      .from('turf_zones')
      .select(`
        *,
        turf_history(*)
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(zones || [])
  } catch (error) {
    console.error('Error fetching turf zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch turf zones' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    // Only admins and leaders can create turf zones
    if (!user || !['ADMIN', 'LEADER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, coordinates, status, controlledBy } = body

    const { data: zone, error } = await supabase
      .from('turf_zones')
      .insert({
        name,
        description,
        coordinates,
        status,
        controlled_by: controlledBy,
        contested_by: [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    console.error('Error creating turf zone:', error)
    return NextResponse.json(
      { error: 'Failed to create turf zone' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    if (!user || !['ADMIN', 'LEADER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { zoneId, status, controlledBy, contestedBy, action, description } = body

    // Update the zone
    const { data: zone, error: updateError } = await supabase
      .from('turf_zones')
      .update({
        status,
        controlled_by: controlledBy,
        contested_by: contestedBy,
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (updateError) throw updateError

    // Create history entry
    const { error: historyError } = await supabase
      .from('turf_history')
      .insert({
        zone_id: zoneId,
        action,
        description,
        faction: controlledBy || 'Unknown',
      })

    if (historyError) console.error('Error creating history:', historyError)

    // Trigger real-time update (if Pusher is configured)
    if (pusherServer) {
      await pusherServer.trigger(PUSHER_CHANNELS.TURF, PUSHER_EVENTS.TURF_UPDATE, zone)
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error('Error updating turf zone:', error)
    return NextResponse.json(
      { error: 'Failed to update turf zone' },
      { status: 500 }
    )
  }
}
