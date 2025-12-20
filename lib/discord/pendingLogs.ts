import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { sendEncounterLogToDiscord, resolveDiscordAuthor  } from '../discord'
import { format } from 'date-fns'

type WarLog = Database['public']['Tables']['war_logs']['Row'] & {
  submitted_by_user: SubmittedByUser | null;
  members_involved: string[] | null;
  friends_involved: string[] | null;
  players_killed: string[] | null;
  log_type: 'ATTACK' | 'DEFENSE';
  date_time: string;
  notes: string | null;
  evidence_url: string | null;
  submitted_by_avatar: string | null;
  user: {
    discord_id: string | null;
    avatar: string | null;
    username: string | null;
  } | null;
};

interface SubmittedByUser {
  username: string | null;
  discord_id: string | null;
  avatar: string | null;
  display_name: string | null;
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendPendingLogsToDiscord(warId: string, siteUrl?: string) {
  try {
    console.log(`[DEBUG] Fetching pending logs for war ${warId}`);
    
    // Verify webhook URL is set
    const attackWebhookUrl = process.env.DISCORD_ATTACK_LOGS_WEBHOOK;
    if (!attackWebhookUrl) {
      console.error('[ERROR] DISCORD_ATTACK_LOGS_WEBHOOK is not set in environment variables');
      return { sent: 0, errors: ['DISCORD_ATTACK_LOGS_WEBHOOK is not configured'] };
    }
    console.log('[DEBUG] Using attack logs webhook URL:', attackWebhookUrl);

    // Get all logs for this war that haven't been sent to Discord yet
    const { data: logs, error: logsError } = await supabase
      .from('war_logs')
      .select(`
        id,
        log_type,
        date_time,
        notes,
        evidence_url,
        members_involved,
        friends_involved,
        players_killed,
        submitted_by,
        submitted_by_display_name,
        user:users!war_logs_submitted_by_fkey (
          discord_id,
          avatar,
          username
        )
      `)
      .eq('war_id', warId)
      .is('discord_message_id', null)
      .order('date_time', { ascending: true })
      .returns<WarLog[]>()

    if (logsError) {
      console.error('[ERROR] Error fetching pending logs:', logsError);
      throw logsError;
    }

    console.log(`[DEBUG] Found ${logs?.length || 0} pending logs for war ${warId}`);

    if (!logs || logs.length === 0) {
      console.log('[DEBUG] No pending logs to send');
      return { sent: 0 };
    }

    // Get war details for the embed
    const { data: war, error: warError } = await supabase
      .from('faction_wars')
      .select('enemy_faction, slug')
      .eq('id', warId)
      .single();

    if (warError || !war) {
      const errorMsg = warError?.message || 'War not found';
      console.error(`[ERROR] Error fetching war ${warId}:`, errorMsg);
      throw new Error(`Failed to fetch war: ${errorMsg}`);
    }

    console.log(`[DEBUG] Processing logs for war: ${war.enemy_faction} (${warId})`);

    let sentCount = 0;
    const errors: string[] = [];

    // Send each log to Discord
    for (const [index, log] of (logs || []).entries()) {
      try {
        console.log(`[DEBUG] Processing log ${index + 1}/${logs.length} (ID: ${log.id})`);
        
        const warUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}/wars/${war.slug || warId}` : undefined;
        
        console.log('[DEBUG] Sending pending log to Discord:', {
          logId: log.id,
          logType: log.log_type,
          members: log.members_involved,
          friends: log.friends_involved,
          enemies: log.players_killed,
          notes: log.notes,
          evidence: log.evidence_url
        });
        
        const author = await resolveDiscordAuthor(
          log.user?.discord_id || undefined,
          log.user?.username || log.submitted_by_display_name || 'Unknown'
        );
        
        // Construct the avatar URL if available
        const avatarUrl = log.user?.avatar 
          ? `https://cdn.discordapp.com/avatars/${log.user.discord_id}/${log.user.avatar}${log.user.avatar.startsWith('a_') ? '.gif' : '.png'}`
          : undefined;

        const discordResult = await sendEncounterLogToDiscord(
          log.log_type === 'ATTACK' ? 'ATTACK' : 'DEFENSE',
          {
            title: `${log.log_type === 'ATTACK' ? 'Attack on' : 'Defense from'} ${war.enemy_faction || 'Unknown Faction'}`,
            description: format(new Date(log.date_time), 'yyyy-MM-dd HH:mm:ss'),
            timestamp: new Date(log.date_time),
            notes: log.notes || undefined,
            evidence_url: log.evidence_url || undefined,
            members_involved: log.members_involved ?? [],
            friends_killed: log.friends_involved ?? [],
            enemies_killed: log.players_killed ?? [],
            war_name: war.enemy_faction,
            war_url: warUrl,
            author: {
              username: author.username,
              displayName: log.submitted_by_display_name || author.displayName,
              avatar: avatarUrl || author.avatar
            }
          }
        );

        if (discordResult?.ok && discordResult.messageId) {
          console.log('Before database update - log:', {
            id: log.id,
            messageId: discordResult.messageId,
            channelId: discordResult.channelId
        });

        const { error: updateError } = await supabase
            .from('war_logs')
            .update({
                discord_message_id: discordResult.messageId,
                discord_channel_id: discordResult.channelId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', log.id);

        console.log('After database update - result:', { updateError });

          if (updateError) {
            const errorMsg = `Failed to update log ${log.id} with Discord message ID: ${updateError.message}`;
            console.error(`[ERROR] ${errorMsg}`);
            errors.push(errorMsg);
            continue;
          }

          // Verify the update
          const { data: updatedLog, error: fetchError } = await supabase
            .from('war_logs')
            .select('id, discord_message_id, discord_channel_id')
            .eq('id', log.id)
            .single();

          if (fetchError) {
            const errorMsg = `Failed to verify update for log ${log.id}: ${fetchError.message}`;
            console.error(`[ERROR] ${errorMsg}`);
            errors.push(errorMsg);
            continue;
          }

          if (updatedLog?.discord_message_id === discordResult.messageId) {
            console.log(`[SUCCESS] Confirmed log ${log.id} was updated with Discord message ID: ${discordResult.messageId}`);
            sentCount++;
          } else {
            const errorMsg = `Discord message ID mismatch for log ${log.id}. Expected: ${discordResult.messageId}, Got: ${updatedLog?.discord_message_id}`;
            console.error(`[ERROR] ${errorMsg}`);
            errors.push(errorMsg);
          }
        } else {
            const errorMsg = `Failed to send log ${log.id} to Discord: No message ID in response`;
            console.error(`[ERROR] ${errorMsg}`);
            errors.push(errorMsg);
        }
      } catch (e) {
        const errorMsg = `Error processing log ${log.id}: ${e instanceof Error ? e.message : String(e)}`;
        console.error(`[ERROR] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    if (errors.length > 0) {
      console.warn(`[WARNING] Completed with ${errors.length} errors while processing logs`);
      errors.forEach((error, i) => console.warn(`[ERROR ${i + 1}] ${error}`));
    }

    console.log(`[SUCCESS] Successfully sent ${sentCount} of ${logs.length} logs to Discord`);
    return { 
      sent: sentCount,
      total: logs.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    const errorMsg = `[CRITICAL] Error in sendPendingLogsToDiscord: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
    throw new Error(errorMsg);
  }
}
