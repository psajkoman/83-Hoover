// lib/discord.ts
import { formatServerTime } from './dateUtils';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<{
    title?: string;
    url?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
    footer?: { text: string; icon_url?: string };
    thumbnail?: { url: string };
    image?: { url: string };
  }>;
  username?: string;
  avatar_url?: string;
}

type DiscordWebhookSendResult = {
  ok: boolean;
  messageId?: string;
  channelId?: string;
  raw?: any;
  error?: string;
};

type WarRegulations = {
  attacking_cooldown_hours?: number;
  pk_cooldown_type?: string;
  pk_cooldown_days?: number;
  max_participants?: number;
  weapon_restrictions?: any;
};

type CurrentWarEmbedInput = {
  id: string;
  slug?: string | null;
  enemy_faction: string;
  war_level?: string | null;
  war_type?: string | null;
  started_at?: string | null;
  regulations?: WarRegulations | null;
  scoreboard?: {
    kills: number;
    deaths: number;
  };
  siteUrl?: string;
  lastDefense?: {
    date_time: string;
  } | null;
  lastAttack?: {
    date_time: string;
  } | null;
};

const withWait = (webhookUrl: string) => {
  // Discord supports ?wait=true to return the created message payload.
  if (webhookUrl.includes('?')) return `${webhookUrl}&wait=true`;
  return `${webhookUrl}?wait=true`;
};

const getNextAttackTime = (lastEncounterTime: string, cooldownHours: number): string => {
  const lastEncounter = new Date(lastEncounterTime);
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const nextAttackTime = new Date(lastEncounter.getTime() + cooldownMs);
  const now = new Date();
  
  if (now >= nextAttackTime) {
    return '✅ Ready to attack';
  }
  
  const diffMs = nextAttackTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `⏳ Next attack in ${diffHours}h ${diffMinutes}m`;
}

export async function resolveDiscordAuthor(
  discordId: string | undefined,
  fallbackUsername: string
): Promise<{ username: string; displayName: string; avatar?: string }> {
  const base = {
    username: fallbackUsername,
    displayName: fallbackUsername,
    avatar: undefined as string | undefined,
  };

  if (!discordId) return base;

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return base;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) return base;

    const member: any = await res.json();
    const displayName =
      member?.nick || member?.user?.global_name || member?.user?.username || fallbackUsername;

    let avatar: string | undefined;
    if (member?.avatar) {
      avatar = `https://cdn.discordapp.com/guilds/${guildId}/users/${discordId}/avatars/${member.avatar}.png?size=128`;
    } else if (member?.user?.avatar) {
      avatar = `https://cdn.discordapp.com/avatars/${discordId}/${member.user.avatar}.png?size=128`;
    }

    return {
      username: displayName,
      displayName,
      avatar,
    };
  } catch {
    return base;
  }
}

export async function sendToDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<DiscordWebhookSendResult> {
  try {
    console.log('Sending to Discord webhook:', {
      webhookUrl: webhookUrl.replace(/\/([^/]+)$/, '/***'),
      payload: JSON.stringify(payload, null, 2)
    });

    const response = await fetch(withWait(webhookUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} - ${responseText}`);
    }

    let raw: any;
    try {
      raw = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      raw = undefined;
    }

    return {
      ok: true,
      messageId: raw?.id,
      channelId: raw?.channel_id,
      raw,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sendToDiscordWebhook:', {
      error: errorMessage,
      payload: JSON.stringify(payload, null, 2)
    });
    return { 
      ok: false,
      error: errorMessage
    };
  }
}

export function buildEncounterWebhookPayload(
  type: 'ATTACK' | 'DEFENSE',
  logData: {
    title: string;
    description: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: Date;
    author?: {
      id?: string;
      username: string;
      displayName?: string;
      avatar?: string;
      discord_display_name?: string;
    };
    notes?: string;
    evidence_url?: string;
    members_involved?: string[];
    friends_killed?: string[];
    enemies_killed?: string[];
    war_name?: string;
    war_url?: string;
  }
): { webhookUrl: string; payload: DiscordWebhookPayload } {
  const webhookUrl = type === 'ATTACK'
    ? process.env.DISCORD_ATTACK_LOGS_WEBHOOK
    : process.env.DISCORD_DEFENSE_LOGS_WEBHOOK;

  if (!webhookUrl) {
    throw new Error(`No webhook URL configured for ${type} logs`);
  }
  const color = 0x252b32;
  const logTime = logData.timestamp ? new Date(logData.timestamp) : new Date();
  
  // Format the date and time using server's timezone (Europe/London)
  const formatTime = (date: Date) => {
    return formatServerTime(date).replace(' at ', ' ');
  };

  const formatNames = (names: string[]) => names.length > 0 ? names.map(name => `\u200B\u2002${name}`).join('\n') : ' ';

  const membersWithDeaths = (logData.members_involved || []).map((member) => {
    // Track if member is dead
    const isDead = (logData.friends_killed || []).includes(member);
    return { name: member, isDead };
  })
  .sort((a, b) => {
    // Sort dead members to the bottom
    if (a.isDead && !b.isDead) return 1;
    if (!a.isDead && b.isDead) return -1;
    // Keep original order if both are dead or both are alive
    return 0;
  })
  .map(member => member.isDead ? `${member.name} ☠️` : member.name);
const encounterFields = [
  {
    name: "`MEMBERS INVOLVED`",
    value: formatNames(membersWithDeaths),
    inline: true
  },
  {
    name: "`ENEMY DEATHS`",
    value: logData.enemies_killed?.length ? formatNames(logData.enemies_killed) : 'None',
    inline: true
  }
];

const evidenceUrls = logData.evidence_url ? [logData.evidence_url] : [];
const firstEvidenceUrl = evidenceUrls[0] || '';
const firstEvidenceIsImage = /.(jpg|jpeg|png|gif|webp|bmp)$/i.test(firstEvidenceUrl);
const firstEvidenceIsVideo = /.(mp4|webm|mov)$/i.test(firstEvidenceUrl);

const payload: DiscordWebhookPayload = {
  embeds: [{
    title: logData.title,
    url: logData.war_url || undefined,
    description: logData.notes,
    color,
    fields: [
      ...encounterFields,
      ...((logData.notes || evidenceUrls.length > 0)
        ? [{
            name: "`EVIDENCE`",
            value: evidenceUrls.length > 0
              ? evidenceUrls.map((u: string) => `\u200B\u2002${u}`).join('\n')
              : 'No evidence provided',
            inline: false
          }]
        : [])
    ],
    thumbnail: firstEvidenceIsVideo
      ? { url: 'https://support.discord.com/hc/user_images/v5lrcRh6xIijhePbuIfSgA.png' }
      : undefined,
    image: firstEvidenceIsImage ? { url: firstEvidenceUrl } : undefined,
    footer: {
      text: `Posted by ${logData.author?.displayName || logData.author?.username || 'System'}\u2002•\u2002${formatTime(logTime)}`,
      icon_url: logData.author?.avatar
        ? logData.author.avatar.startsWith('http')
          ? logData.author.avatar // Full URL provided
          : `https://cdn.discordapp.com/avatars/${logData.author.id || '0'}/${logData.author.avatar}${logData.author.avatar?.startsWith('a_') ? '.gif' : '.png'}`
        : undefined
    }
  }]
};

return { webhookUrl, payload };
}

export async function sendEncounterLogToDiscord(
  type: 'ATTACK' | 'DEFENSE',
  logData: {
    title: string;
    description: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: Date;
    author?: {
      username: string;
      displayName?: string;
      avatar?: string;
    };
    notes?: string;
    evidence_url?: string;
    members_involved?: string[];
    friends_killed?: string[];
    enemies_killed?: string[];
    war_name?: string;
    war_url?: string;
  }
): Promise<DiscordWebhookSendResult> {
  try {
    
    // Get the appropriate webhook URL based on log type
    const webhookUrl = type === 'ATTACK' 
      ? process.env.DISCORD_ATTACK_LOGS_WEBHOOK 
      : process.env.DISCORD_DEFENSE_LOGS_WEBHOOK;
    
    if (!webhookUrl) {
      const errorMsg = `No webhook URL configured for ${type} logs`;
      console.error(`[ERROR] ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }
        
    const { payload } = buildEncounterWebhookPayload(type, logData);
    const res = await sendToDiscordWebhook(webhookUrl, payload);
    
    if (!res.ok) {
      console.error(`Failed to send ${type} log to Discord:`, res.error || 'Unknown error');
    } else {
      console.log(`Successfully sent ${type} log to Discord`);
    }
    
    return res;
  } catch (error) {
    const errorMsg = `Error in sendEncounterLogToDiscord (${type}): ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    console.error('Error details:', error);
    return { ok: false, error: errorMsg };
  }
}

export async function editDiscordWebhookMessage(
  webhookUrl: string,
  messageId: string,
  payload: DiscordWebhookPayload
): Promise<boolean> {
  try {
    const url = webhookUrl.split('?')[0];
    const response = await fetch(`${url}/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    return response.ok;
  } catch (error) {
    console.error('Failed to edit Discord webhook message:', error);
    return false;
  }
}

export async function deleteDiscordWebhookMessage(
  webhookUrl: string,
  messageId: string
): Promise<boolean> {
  try {
    const url = webhookUrl.split('?')[0];
    const response = await fetch(`${url}/messages/${messageId}`, {
      method: 'DELETE',
    });

    const responseText = await response.text();

    return response.ok;
  } catch (error) {
    console.error('Failed to delete Discord webhook message:', error);
    return false;
  }
}

// Helper function to format cooldown time
function formatCooldownTime(lastTime: string, cooldownHours: number): string {
  if (!lastTime) return 'Now';
  
  const lastAttackTime = new Date(lastTime);
  const cooldownEnd = new Date(lastAttackTime.getTime() + (cooldownHours * 60 * 60 * 1000));
  const now = new Date();
  
  if (now >= cooldownEnd) {
    return 'Now';
  }
  
  const diffMs = cooldownEnd.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMinutes}m`;
  } else {
    return `in ${diffMinutes}m`;
  }
}

export function buildWarWebhookPayload(war: CurrentWarEmbedInput): { webhookUrl: string; payload: DiscordWebhookPayload } {
  const webhookUrl = process.env.DISCORD_CURRENT_WARS_WEBHOOK;
  
  if (!webhookUrl) {
    throw new Error('No webhook URL configured for current wars');
  }

  const baseUrl = (war.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const warUrl = baseUrl ? `${baseUrl}/wars/${war.slug || war.id}` : undefined;
  
  // Calculate scoreboard (kills - deaths)
  const totalKills = war.scoreboard?.kills ?? 0;
  const totalDeaths = war.scoreboard?.deaths ?? 0;
  const scoreDiff = totalKills - totalDeaths;
  const scoreText = scoreDiff > 0 
    ? `+${scoreDiff} up` 
    : scoreDiff < 0 
      ? `${scoreDiff} down` 
      : 'Even';

  const regs = war.regulations || {};
  const attackCooldown = regs.attacking_cooldown_hours || 6;
  const pkCooldownType = (regs.pk_cooldown_type || '').toLowerCase();
  const pkCooldownText = pkCooldownType === 'permanent'
    ? 'Permanent'
    : (typeof regs.pk_cooldown_days === 'number' ? `${regs.pk_cooldown_days} days` : 'Not specified');

  const attackCooldownText = typeof attackCooldown === 'number'
    ? `${attackCooldown} hours`
    : 'Not specified';

  const maxParticipantsText = typeof regs.max_participants === 'number'
    ? `${regs.max_participants} members per attack`
    : 'Not specified';

  const weaponRestrictionsText = (regs.weapon_restrictions === null || regs.weapon_restrictions === undefined)
    ? 'None'
    : (typeof regs.weapon_restrictions === 'string'
        ? regs.weapon_restrictions
        : (Array.isArray(regs.weapon_restrictions)
            ? regs.weapon_restrictions.join(', ') || 'None'
            : JSON.stringify(regs.weapon_restrictions)));

  // Format regulations
  const regulationsText = [
    `**Attack Cooldown:** ${attackCooldownText}`,
    `**PK Cooldown:** ${pkCooldownText}`,
    `**Max Participants:** ${maxParticipantsText}`,
    `**Weapon Restrictions:** ${weaponRestrictionsText || 'None'}`
  ].join('\n');

  const warLevel = (war.war_level || 'NON_LETHAL').toUpperCase();
  const warType = (war.war_type || 'UNCONTROLLED').toUpperCase();
  const startedAt = war.started_at ? new Date(war.started_at) : null;

  // Format the date and time as DD/MM/YYYY HH:MM AM/PM in Europe/London timezone
  const formatDateTime = (date: Date): string => {
    // Convert to London time
    const londonDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const day = londonDate.getDate().toString().padStart(2, '0');
    const month = (londonDate.getMonth() + 1).toString().padStart(2, '0');
    const year = londonDate.getFullYear();
    let hours = londonDate.getHours();
    const minutes = londonDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  };

  // Function to calculate next attack time
  const getNextAttackTime = (lastTime: string): string => {
    if (!lastTime) return 'Now';
    
    const lastTimeDate = new Date(lastTime);
    const nextAttackTime = new Date(lastTimeDate.getTime() + (attackCooldown * 60 * 60 * 1000));
    
    return formatDateTime(nextAttackTime);
  };

  // Calculate next attack times
  const enemyNextAttack = war.lastDefense 
    ? getNextAttackTime(war.lastDefense.date_time)
    : 'Now';
    
  const lwcNextAttack = war.lastAttack
    ? getNextAttackTime(war.lastAttack.date_time)
    : 'Now';

  const currentTime = new Date();
  const formattedTime = formatDateTime(currentTime);

  const payload: DiscordWebhookPayload = {
    embeds: [{
      title: war.enemy_faction,
      url: warUrl,
      color: warLevel === 'LETHAL' ? 0xE74C3C : 0x3498DB,
      fields: [
        {
          name: '`WAR LEVEL`',
          value: warLevel === 'LETHAL' ? '🔥 Lethal' : '🛡️ Non-lethal',
          inline: true
        },
        {
          name: '`WAR TYPE`',
          value: warType === 'CONTROLLED' ? '🎯 Controlled' : '🌪️ Uncontrolled',
          inline: true
        },
        {
          name: '`START DATE`',
          value: startedAt ? formatDateTime(startedAt) : 'Unknown',
          inline: true
        },
        {
          name: '`SCOREBOARD`',
          value: scoreText,
          inline: true
        },
        {
          name: '`WAR REGULATIONS`',
          value: regulationsText,
          inline: false
        },
        {
          name: '`COOLDOWN STATUS`',
          value: [
            `**${war.enemy_faction}**`,
            `- Next attack: ${enemyNextAttack}`,
            '**Low West Crew**',
            `- Next attack: ${lwcNextAttack}`
          ].join('\n'),
          inline: true
        }
      ],
      footer: {
        text: `Updated on ${formattedTime}`
      },
      timestamp: undefined
    }]
  };
  
  return { webhookUrl, payload };
}

export async function sendWarToDiscord(war: any): Promise<DiscordWebhookSendResult> {
  try {
    const { webhookUrl, payload } = buildWarWebhookPayload(war);
    const result = await sendToDiscordWebhook(webhookUrl, payload);
    
    if (!result.ok) {
      throw new Error('Failed to send war to Discord');
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendWarToDiscord:', error);
    return { ok: false };
  }
}
export async function updateWarInDiscord(messageId: string, war: CurrentWarEmbedInput): Promise<boolean> {
  try {
    const { webhookUrl, payload } = buildWarWebhookPayload(war);
    return await editDiscordWebhookMessage(webhookUrl, messageId, payload);
  } catch (error) {
    console.error('Error in updateWarInDiscord:', error);
    return false;
  }
}

export async function deleteWarFromDiscord(messageId: string): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WAR_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WAR_WEBHOOK_URL is not set');
    return false;
  }

  return deleteDiscordWebhookMessage(webhookUrl, messageId);
}

export interface DiscordGuildMember {
  user?: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  };
  nick?: string;
  roles: string[];
  joined_at: string;
}

export async function getGuildMembers(): Promise<DiscordGuildMember[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  
  if (!token || !guildId) {
    console.error('DISCORD_BOT_TOKEN or DISCORD_GUILD_ID is not set');
    return [];
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch guild members: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Discord guild members:', error);
    return [];
  }
}
