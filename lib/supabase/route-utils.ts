import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { getCookie } from '@/lib/cookies'

export async function getRouteSupabase() {
  const accessToken = await getCookie('sb-access-token')
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

export async function verifySession() {
  const supabase = await getRouteSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
