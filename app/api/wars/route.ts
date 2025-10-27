import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase, verifySession } from '@/lib/supabase/route-utils'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type War = Database['public']['Tables']['faction_wars']['Row']

export async function GET(request: NextRequest) {
  try {
    const user = await verifySession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await getRouteSupabase()
    const { data: wars, error } = await supabase
      .from('faction_wars')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(wars)
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

    const supabase = await getRouteSupabase()

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('discord_id', (session.user as any).discordId)
      .single<{ id: string; role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST' }>()

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
        .single<{
          attacking_cooldown_hours: number
          pk_cooldown_type: string
          pk_cooldown_days: number
          max_participants: number
          max_assault_rifles: number
          weapon_restrictions: any
        }>()

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

    // Using a type assertion to bypass the type error
    // The proper fix would be to regenerate the Supabase types
    const { data: war, error } = await (supabase as any)
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
