// app/api/leaves/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const leaveId = params.id
    if (!leaveId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('leaves')
      .select(
        `
          *,
          creator:users!leaves_created_by_fkey(
            display_name,
            discord_id,
            username
          )
        `
      )
      .eq('id', leaveId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    const creator = (data as any).creator as
      | { display_name: string | null; discord_id: string; username: string }
      | null

    const leave = {
      ...(data as any),
      creator_display_name: creator?.display_name ?? null,
      creator_discord_id: creator?.discord_id ?? null,
      created_by_username: creator?.username ?? null,
    }

    return NextResponse.json({ leave })
  } catch (error) {
    console.error('Error fetching leave:', error)
    return NextResponse.json({ error: 'Failed to fetch leave' }, { status: 500 })
  }
}