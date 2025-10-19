import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postId, content } = body

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content,
        post_id: postId,
        author_id: user.id,
      })
      .select(`
        *,
        author:users!comments_author_id_fkey(id, username, avatar)
      `)
      .single()

    if (error) throw error

    // Trigger real-time update
    await pusherServer.trigger(
      PUSHER_CHANNELS.FEED,
      PUSHER_EVENTS.NEW_COMMENT,
      { postId, comment }
    )

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
