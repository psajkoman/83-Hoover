// lib/activity.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function logActivity(
  type: Database['public']['Enums']['log_type'],
  action: string,
  target_id: string,
  target_name: string,
  actor_id: string,
  actor_name: string,
  details: unknown = null
) {
  const logData = {
    type,
    title: `${action} - ${target_name}`,
    description: details ? JSON.stringify(details) : null,
    location: null,
    participants: [actor_id],
    outcome: null,
    author_id: actor_id,
    timestamp: new Date().toISOString()
  } as never

  const { error } = await supabaseAdmin
    .from('logs')
    .insert([logData])

  if (error) {
    console.error('Error logging activity:', error)
    throw error
  }
}