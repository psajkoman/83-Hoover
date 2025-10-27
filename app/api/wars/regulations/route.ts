import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Get global war regulations
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => Promise.resolve(cookieStore) })

    const { data: regulations, error } = await supabase
      .from('global_war_regulations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error

    return NextResponse.json({ regulations })
  } catch (error) {
    console.error('Error fetching regulations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch regulations' },
      { status: 500 }
    )
  }
}

// Update global war regulations
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => Promise.resolve(cookieStore) })

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      attacking_cooldown_hours,
      pk_cooldown_type,
      pk_cooldown_days,
      max_participants,
      max_assault_rifles,
      weapon_restrictions,
    } = body

    // Get current regulations
    const { data: current } = await supabase
      .from('global_war_regulations')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'No regulations found' }, { status: 404 })
    }

    const { data: regulations, error } = await supabase
      .from('global_war_regulations')
      .update({
        attacking_cooldown_hours,
        pk_cooldown_type,
        pk_cooldown_days,
        max_participants,
        max_assault_rifles,
        weapon_restrictions,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ regulations })
  } catch (error) {
    console.error('Error updating regulations:', error)
    return NextResponse.json(
      { error: 'Failed to update regulations' },
      { status: 500 }
    )
  }
}
