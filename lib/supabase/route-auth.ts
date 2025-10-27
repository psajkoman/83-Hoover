import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { cookies as nextCookies } from 'next/headers'

export async function getRouteSupabaseClient() {
  const allCookies = await nextCookies() // ⬅ await here
  const accessToken = allCookies.get('sb-access-token')?.value
  
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
        persistSession: false
      }
    }
  )
}

export async function getSessionUser() {
  const supabase = await getRouteSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
