-- Add Discord message tracking for war logs
ALTER TABLE war_logs
ADD COLUMN IF NOT EXISTS discord_message_id TEXT,
ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;
