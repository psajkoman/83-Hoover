import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    const discordId = (session.user as any).discordId;

    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID not found' }, { status: 400 });
    }

    // Fetch all user-related data in parallel
    const [
      { data: user },
      { data: userSettings },
      { data: userActivity },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .single(),
      
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', discordId)
        .maybeSingle(),
      
      supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', discordId)
        .maybeSingle(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format the response
    const response = {
      user: {
        id: user.id,
        discord_id: user.discord_id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      settings: userSettings || {},
      activity: userActivity || {},
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/v2/user/me:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user data',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
