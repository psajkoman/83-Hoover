'use server'

import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Database } from '@/types/supabase'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // REQUIRED
)

export async function addMediaAction(input: {
  title?: string
  description?: string
  url: string
  media_type: 'IMAGE' | 'VIDEO'
}) {
  // 1️⃣ AUTH CHECK (ONLY THIS)
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.discordId) {
    throw new Error('Authentication required')
  }

  // 2️⃣ RESOLVE INTERNAL USER (CRITICAL STEP)
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('discord_id', session.user.discordId)
    .single()

  if (userError || !user) {
    throw new Error('User not found in users table')
  }

  // 3️⃣ INSERT MEDIA WITH INTERNAL UUID
  const { data: media, error: mediaError } = await supabaseAdmin
    .from('media')
    .insert({
      title: input.title ?? null,
      description: input.description ?? null,
      url: input.url,
      media_type: input.media_type,
      user_id: user.id
    })
    .select()
    .single()

  if (mediaError) {
    throw new Error(mediaError.message)
  }

  return media
}
