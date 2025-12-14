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
  const formattedTime = logTime.toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/London'
  });

  const formatNames = (names: string[]) =>
    names.length > 0 ? names.map(name => `- ${name}`).join('\n') : ' ';

  const fields = [
    {
      name: 'Members Involved',
      value: formatNames(logData.members_involved || []),
      inline: false
    },
    {
      name: 'Our Deaths',
      value: formatNames(logData.friends_killed || []),
      inline: true
    },
    {
      name: 'Enemy Deaths',
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
  const firstEvidenceIsVideo = !!firstEvidenceUrl && /\.(mp4|webm|mov)(\?.*)?$/i.test(firstEvidenceUrl);

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        title: logData.title,
        url: logData.war_url || undefined,
        description: logData.description,
        color,
        fields: [
          ...fields,
          ...(logData.notes ? [{ name: 'Notes', value: logData.notes, inline: false }] : []),
          ...(evidenceUrls.length > 0
            ? [{ name: 'Evidence', value: evidenceUrls.map((u) => `- ${u}`).join('\n'), inline: false }]
            : []),
          { name: 'Time', value: formattedTime, inline: false }
        ],
        thumbnail:
          firstEvidenceIsVideo
            ? { url: 'https://support.discord.com/hc/user_images/v5lrcRh6xIijhePbuIfSgA.png' }
            : undefined,
        image: firstEvidenceIsImage ? { url: firstEvidenceUrl } : undefined,
        footer: {
          text: `Posted by ${logData.author?.displayName || logData.author?.username || 'System'}`,
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
