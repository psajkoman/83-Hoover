-- Add Discord message tracking for current wars embeds
ALTER TABLE faction_wars
ADD COLUMN IF NOT EXISTS discord_message_id TEXT,
ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;
