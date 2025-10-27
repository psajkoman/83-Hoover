import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

export async function createRouteClient() {
  // ⬅ cookies() must be awaited
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value ?? ''

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
      },
    }
  )
}
