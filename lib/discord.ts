// lib/discord.ts
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
};

const withWait = (webhookUrl: string) => {
  // Discord supports ?wait=true to return the created message payload.
  if (webhookUrl.includes('?')) return `${webhookUrl}&wait=true`;
  return `${webhookUrl}?wait=true`;
};

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
    console.log('Sending to Discord webhook:', webhookUrl, JSON.stringify(payload, null, 2));

    const response = await fetch(withWait(webhookUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Discord webhook response status:', response.status);
    console.log('Discord webhook response:', responseText);
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} - ${responseText}`);
    }

    let raw: any = undefined;
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
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
    return { ok: false };
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
): { webhookUrl: string; payload: DiscordWebhookPayload } {
  const webhookUrl = type === 'ATTACK'
    ? process.env.DISCORD_ATTACK_LOGS_WEBHOOK
    : process.env.DISCORD_DEFENSE_LOGS_WEBHOOK;

  if (!webhookUrl) {
    throw new Error(`No webhook URL configured for ${type} logs`);
  }
  console.log('logData', logData)
  const color = 0x252b32;
  const logTime = logData.timestamp ? new Date(logData.timestamp) : new Date();
  console.log('logTime', logTime);
  
  // Format the date and time as YYYY-MM-DD HH:MM
  const formatTime = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const daySuffix = 
      day % 10 === 1 && day !== 11 ? 'st' :
      day % 10 === 2 && day !== 12 ? 'nd' :
      day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    
    let hours = date.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    
    return `${month} ${day}${daySuffix} at ${hours}:${minutes} ${ampm}`;
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
console.log(JSON.stringify(formatNames(membersWithDeaths)));
const fields = [
  {
    name: "`MEMBERS INVOLVED`",
    value: formatNames(membersWithDeaths),
    inline: true
  },
  {
    name: "`ENEMY DEATHS`",
    value: formatNames(logData.enemies_killed || []),
    inline: true
  }
] as Array<{ name: string; value: string; inline?: boolean }>;

  const evidenceUrls = (logData.evidence_url || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);
  const firstEvidenceUrl = evidenceUrls[0];
  const firstEvidenceIsImage = !!firstEvidenceUrl && /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(firstEvidenceUrl);
  const firstEvidenceIsVideo = !!firstEvidenceUrl && (/\.(mp4|webm|mov)(\?.*)?$/i.test(firstEvidenceUrl) || firstEvidenceUrl.includes('youtube') || firstEvidenceUrl.includes('streamable'));

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        title: logData.title,
        url: logData.war_url || undefined,
        description: logData.notes,
        color,
        fields: [
          ...fields,
          ...((logData.notes || evidenceUrls.length > 0)
            ? [{
                name: "`EVIDENCE`",
                value: [
                  evidenceUrls.length > 0
                    ? evidenceUrls.map((u) => `\u200B\u2002${u}`).join('\n')
                    : null
                ]
                  .filter(Boolean)
                  .join('\n'),
                inline: false
              }]
            : [])
        ],
        thumbnail:
          firstEvidenceIsVideo
            ? { url: 'https://support.discord.com/hc/user_images/v5lrcRh6xIijhePbuIfSgA.png' }
            : undefined,
        image: firstEvidenceIsImage ? { url: firstEvidenceUrl } : undefined,
        footer: {
          text: `Posted by ${logData.author?.displayName || logData.author?.username || 'System'}\u2002•\u2002${formatTime(logTime)}`,
          icon_url: logData.author?.avatar || undefined
        }
      }
    ]
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
    const { webhookUrl, payload } = buildEncounterWebhookPayload(type, logData);
    const res = await sendToDiscordWebhook(webhookUrl, payload);
    return res;
  } catch (error) {
    console.error(`Error in sendEncounterLogToDiscord (${type}):`, error);
    return { ok: false };
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
    console.log('Discord edit webhook response status:', response.status);
    console.log('Discord edit webhook response:', responseText);

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
    console.log('Discord delete webhook response status:', response.status);
    console.log('Discord delete webhook response:', responseText);

    return response.ok;
  } catch (error) {
    console.error('Failed to delete Discord webhook message:', error);
    return false;
  }
}
