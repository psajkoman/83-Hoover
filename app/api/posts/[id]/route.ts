import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)
    
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, avatar, role, rank),
        comments(
          *,
          author:users!comments_author_id_fkey(id, username, avatar)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
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
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { data: post } = await supabase
      .from('posts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('id', id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    const isPrivileged = ['ADMIN', 'LEADER', 'MODERATOR'].includes(user?.role || '')

    if (post.type === 'ANNOUNCEMENT' && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check permissions
    if (
      post.author.discord_id !== session.user.id &&
      !isPrivileged
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, avatar, role, rank)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: post } = await supabase
      .from('posts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('id', id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', session.user.id)
      .single()

    const isPrivileged = ['ADMIN', 'LEADER', 'MODERATOR'].includes(user?.role || '')

    if (post.type === 'ANNOUNCEMENT' && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check permissions
    if (
      post.author.discord_id !== session.user.id &&
      !isPrivileged
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
