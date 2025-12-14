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

export async function sendToDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload) {
  try {
    console.log('Sending to Discord webhook:', webhookUrl, JSON.stringify(payload, null, 2));
    
    const response = await fetch(webhookUrl, {
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
    return true;
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
    return false;
  }
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
    friends_killed?: string[];
    enemies_killed?: string[];
    war_name?: string;
    war_url?: string;
  }
) {
  try {
    const webhookUrl = type === 'ATTACK' 
      ? process.env.DISCORD_ATTACK_LOGS_WEBHOOK 
      : process.env.DISCORD_DEFENSE_LOGS_WEBHOOK;
    
    if (!webhookUrl) {
      throw new Error(`No webhook URL configured for ${type} logs`);
    }
    const color = 0x252b32;
    const logTime = logData.timestamp ? new Date(logData.timestamp) : new Date();
    const formattedTime = logTime.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    // Format friends and enemies killed as bullet points
    const formatNames = (names: string[]) => 
      names.length > 0 ? names.map(name => `- ${name}`).join('\n') : ' ';
    const fields = [
      { 
        name: 'Time', 
        value: formattedTime, 
        inline: false 
      }
    ];
    if (logData.friends_killed?.length) {
      fields.push({
        name: 'Our Deaths',
        value: formatNames(logData.friends_killed),
        inline: true
      });
    }
    if (logData.enemies_killed?.length) {
      fields.push({
        name: 'Enemy Deaths',
        value: formatNames(logData.enemies_killed),
        inline: true
      });
    }
    if (logData.notes) {
      fields.push({
        name: 'Notes',
        value: logData.notes,
        inline: false
      });
    }
    const evidenceUrls = (logData.evidence_url || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const evidenceValue = evidenceUrls.length > 0 ? evidenceUrls.map((url) => `• ${url}`).join('\n') : ' ';
    fields.push({
      name: 'Evidence',
      value: evidenceValue,
      inline: false
    });

    const firstEvidenceUrl = evidenceUrls[0];
    const firstEvidenceIsImage = typeof firstEvidenceUrl === 'string' && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(firstEvidenceUrl);

    const embedTitleTarget = logData.war_name || logData.title;

    const payload: DiscordWebhookPayload = {
      embeds: [
        {
          title: `${type} LOG — ${embedTitleTarget}`,
          url: logData.war_url || undefined,
          description: `${type === 'ATTACK' ? 'Attack' : 'Defense'} cooldown triggered.`,
          color,
          fields,
          timestamp: logTime.toISOString(),
          thumbnail:
            evidenceUrls.length === 0
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
    return await sendToDiscordWebhook(webhookUrl, payload);
  } catch (error) {
    console.error(`Error in sendEncounterLogToDiscord (${type}):`, error);
    return false;
  }
}
