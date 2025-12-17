-- Add display name column to war_logs
ALTER TABLE war_logs
ADD COLUMN IF NOT EXISTS submitted_by_display_name TEXT;

-- Backfill existing logs with usernames
UPDATE war_logs wl
SET submitted_by_display_name = u.username
FROM users u
WHERE wl.submitted_by = u.id
AND wl.submitted_by_display_name IS NULL;
