import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, avatar, role, rank),
        comments(
          *,
          author:users!comments_author_id_fkey(id, username, avatar)
        )
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: posts, error, count } = await query

    if (error) throw error

    // Get total count
    const { count: total } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      posts: posts || [],
      total: total || 0,
      hasMore: skip + limit < (total || 0),
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, content, mediaUrls, tags, isIC } = body

    // Get user by discord_id (stored in session user_metadata)
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'ANNOUNCEMENT' && !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        type,
        title,
        content,
        media_urls: mediaUrls || [],
        tags: tags || [],
        is_ic: isIC ?? true,
        author_id: user.id,
      })
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, avatar, role, rank)
      `)
      .single()

    if (error) throw error

    // Trigger real-time update (if Pusher is configured)
    if (pusherServer) {
      await pusherServer.trigger(PUSHER_CHANNELS.FEED, PUSHER_EVENTS.NEW_POST, post)
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
