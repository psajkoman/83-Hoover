import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

// Types for Discord API responses
interface DiscordMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
  [key: string]: any;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  mentionable: boolean;
  hoist: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  [key: string]: any;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchWithAuth(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error: ${error}`);
  }

  return response.json();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      return NextResponse.json(
        {
          error: 'Discord configuration missing',
          message: 'DISCORD_GUILD_ID or DISCORD_BOT_TOKEN not set',
        },
        { status: 500 }
      );
    }

    // Fetch all guild data in parallel
    const [members, roles, channels] = await Promise.all([
      fetchWithAuth(
        `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
        botToken
      ),
      fetchWithAuth(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        botToken
      ),
      fetchWithAuth(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        botToken
      ),
    ]);

    // Format members data
    const formattedMembers = members
      .filter((member: DiscordMember) => !member.user?.bot)
      .map((member: DiscordMember) => ({
        id: member.user.id,
        username: member.user.username,
        display_name: member.nick || member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
        roles: member.roles,
        joined_at: member.joined_at,
      }));

    // Format roles data
    const formattedRoles = roles.map((role: DiscordRole) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      permissions: role.permissions,
      mentionable: role.mentionable,
      hoist: role.hoist,
    }));

    // Format channels data
    const formattedChannels = channels
      .filter((channel: DiscordChannel) => channel.type === 0 || channel.type === 2 || channel.type === 4)
      .map((channel: DiscordChannel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parent_id: channel.parent_id,
        position: channel.position,
      }));

    return NextResponse.json({
      members: formattedMembers,
      roles: formattedRoles,
      channels: formattedChannels,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/v2/discord/guild:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch guild data',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
