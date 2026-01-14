-- Add Discord webhook message tracking to leaves

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS discord_message_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT NULL;
