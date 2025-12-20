// app/api/encounter-logs/route.ts
import { NextResponse } from 'next/server';
import { sendEncounterLogToDiscord } from '@/lib/discord';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createWarSlug, isUuid } from '@/lib/warSlug';
import { formatServerTime } from '@/lib/dateUtils';

export async function POST(request: Request) {
  try {
    const {
      type,
      author,
      timestamp,
      notes,
      evidence_url,
      members_involved,
      friends_killed,
      enemies_killed,
      war_id,
      date_time,
      is_first_encounter,
      current_war_level,
      war_level_changed_to_lethal,
    } = await request.json();

    if (!type || !['ATTACK', 'DEFENSE'].includes(type)) {
      console.error('Invalid log type:', type);
      return NextResponse.json(
        { error: 'Invalid log type. Must be ATTACK or DEFENSE' },
        { status: 400 }
      );
    }

    let warName: string | undefined;
    let warUrl: string | undefined;
    let warLevel: string | undefined;
    try {
      if (war_id) {
        let warRow: any = null;

        if (typeof war_id === 'string' && !isUuid(war_id)) {
          const { data, error } = await supabaseAdmin
            .from('faction_wars')
            .select('id, enemy_faction, started_at, slug, war_level')
            .eq('slug', war_id)
            .single();
          if (!error) warRow = data;
        } else {
          const { data, error } = await supabaseAdmin
            .from('faction_wars')
            .select('id, enemy_faction, started_at, slug, war_level')
            .eq('id', war_id)
            .single();
          if (!error) warRow = data;
        }

        if (warRow) {
          warName = warRow.enemy_faction;
          warLevel = warRow.war_level || undefined;
          const slug = warRow.slug || createWarSlug(warRow.enemy_faction, warRow.started_at) || warRow.id;
          const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
          if (origin) warUrl = `${origin.replace(/\/$/, '')}/wars/${slug}`;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve war name/url:', e);
    }

    let displayName: string | undefined = author?.username;
    try {
      const guildId = process.env.DISCORD_GUILD_ID;
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const authorDiscordId = author?.discordId;

      if (guildId && botToken && authorDiscordId) {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${authorDiscordId}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          cache: 'no-store',
        });
        if (memberRes.ok) {
          const member = await memberRes.json();
          displayName = member?.nick || member?.user?.global_name || member?.user?.username || displayName;
        } else {
          const memberErr = await memberRes.text();
          console.warn('Discord member lookup failed:', memberRes.status, memberErr);
        }
      }
    } catch (e) {
      console.warn('Failed to resolve Discord display name:', e);
    }

    // Send to Discord
    console.log('Sending log to Discord...');

    const effectiveWarLevel = (current_war_level as string | undefined) || warLevel

    const embedTitle = `Encounter with ${warName || 'Unknown Faction'}`
    let embedDescription = `${formatServerTime(timestamp)}`

    const discordResult = await sendEncounterLogToDiscord(type, {
      title: embedTitle,
      description: embedDescription,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      notes,
      evidence_url,
      members_involved: Array.isArray(members_involved) ? members_involved : undefined,
      friends_killed,
      enemies_killed,
      war_name: warName,
      war_url: warUrl,
      author: {
        username: displayName || author?.username || 'System',
        displayName,
        avatar: author?.avatar,
      },
    });

    if (!discordResult?.ok) {
      console.error('Failed to send to Discord');
      // Don't fail the request if Discord fails
    }

    return NextResponse.json({ success: true, discordSent: discordResult });
  } catch (error) {
    console.error('Error in encounter-logs API:', error);
    return NextResponse.json(
      { error: 'Failed to process encounter log' },
      { status: 500 }
    );
  }
}