import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
    const body = await request.json()
    
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== process.env.DISCORD_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const { channelId, author, content, attachments, embeds } = body

    // Find webhook config for this channel
    const { data: config } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('channel_id', channelId)
      .single()

    if (!config || !config.is_active) {
      return NextResponse.json({ error: 'Channel not configured' }, { status: 404 })
    }

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', author.id)
      .single()

    if (!user) {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          discord_id: author.id,
          username: author.username,
          discriminator: author.discriminator,
          avatar: author.avatar,
          role: 'MEMBER',
        })
        .select()
        .single()
      
      if (error) throw error
      user = newUser
    }

    // Extract media URLs from attachments
    const mediaUrls = attachments?.map((a: any) => a.url) || []

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        type: config.post_type,
        content,
        media_urls: mediaUrls,
        author_id: user.id,
        discord_message_id: body.id,
        discord_channel_id: channelId,
        is_ic: true,
      })
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, avatar, role, rank)
      `)
      .single()

    if (postError) throw postError

    // Trigger real-time update
    await pusherServer.trigger(PUSHER_CHANNELS.FEED, PUSHER_EVENTS.NEW_POST, post)

    return NextResponse.json({ success: true, postId: post.id })
  } catch (error) {
    console.error('Error processing Discord webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
