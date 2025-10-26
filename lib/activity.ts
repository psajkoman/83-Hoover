// lib/activity.ts
import { createClient } from '@/lib/supabase/server'

export async function logActivity(
  type: string,
  action: string,
  target: { id: string; name: string },
  actor: { id: string; name: string },
  details?: Record<string, any>
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      type,
      action,
      target_id: target.id,
      target_name: target.name,
      actor_id: actor.id,
      actor_name: actor.name,
      details: details || null
    })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}