import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE'

    const { data: wars, error } = await supabase
      .from('faction_wars')
      .select(`
        *,
        started_by_user:users!faction_wars_started_by_fkey(username, discord_id),
        war_logs(count)
      `)
      .eq('status', status)
      .order('started_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ wars })
  } catch (error) {
    console.error('Error fetching wars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wars' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

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
    const { enemy_faction, war_type, regulations } = body

    if (!enemy_faction) {
      return NextResponse.json(
        { error: 'Enemy faction is required' },
        { status: 400 }
      )
    }

    // If uncontrolled, get default regulations
    let warRegulations = regulations
    if (war_type === 'UNCONTROLLED' || !war_type) {
      const { data: globalRegs } = await supabase
        .from('global_war_regulations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (globalRegs) {
        warRegulations = {
          attacking_cooldown_hours: globalRegs.attacking_cooldown_hours,
          pk_cooldown_type: globalRegs.pk_cooldown_type,
          pk_cooldown_days: globalRegs.pk_cooldown_days,
          max_participants: globalRegs.max_participants,
          max_assault_rifles: globalRegs.max_assault_rifles,
          weapon_restrictions: globalRegs.weapon_restrictions,
        }
      }
    }

    const { data: war, error } = await supabase
      .from('faction_wars')
      .insert({
        enemy_faction,
        started_by: user.id,
        status: 'ACTIVE',
        war_type: war_type || 'UNCONTROLLED',
        regulations: warRegulations,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ war }, { status: 201 })
  } catch (error) {
    console.error('Error creating war:', error)
    return NextResponse.json(
      { error: 'Failed to create war' },
      { status: 500 }
    )
  }
}
