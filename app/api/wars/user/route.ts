import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

type WarLog = Database['public']['Tables']['war_logs']['Row'] & {
  war: Database['public']['Tables']['faction_wars']['Row']
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get the user's display name from the users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('display_name')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (userError || !userData?.display_name) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Search for logs where the display name is in members_involved
    const { data: warLogs, error } = await supabaseAdmin
      .from('war_logs')
      .select(`
        *,
        war:faction_wars(*)
      `)
      .contains('members_involved', [userData.display_name])
      .order('date_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user war logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch war logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ warLogs: warLogs || [] })
  } catch (error) {
    console.error('Error in user war logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
