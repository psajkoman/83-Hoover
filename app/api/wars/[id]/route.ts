import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUuid } from '@/lib/warSlug'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    let warId = id
    if (!isUuid(id)) {
      const { data: warBySlug, error: warBySlugError } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (warBySlugError) throw warBySlugError
      if (!warBySlug) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }
      warId = warBySlug.id
    }

    const warQuery = supabase
      .from('faction_wars')
      .select(`
        *,
        started_by_user:users!faction_wars_started_by_fkey(username, discord_id)
      `)

    const { data: war, error } = await (isUuid(id)
      ? warQuery.eq('id', warId)
      : warQuery.eq('slug', id)
    ).single()

    if (error) throw error

    return NextResponse.json({ war })
  } catch (error) {
    console.error('Error fetching war:', error)
    return NextResponse.json(
      { error: 'Failed to fetch war' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    let warId = id
    if (!isUuid(id)) {
      const { data: warBySlug, error: warBySlugError } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (warBySlugError) throw warBySlugError
      if (!warBySlug) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }
      warId = warBySlug.id
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'ENDED') {
        updateData.ended_at = new Date().toISOString()
      }
    }

    const { data: war, error } = await supabase
      .from('faction_wars')
      .update(updateData)
      .eq('id', warId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ war })
  } catch (error) {
    console.error('Error updating war:', error)
    return NextResponse.json(
      { error: 'Failed to update war' },
      { status: 500 }
    )
  }
}
