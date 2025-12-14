-- Add members involved to war logs
ALTER TABLE war_logs
ADD COLUMN IF NOT EXISTS members_involved TEXT[] DEFAULT '{}'::TEXT[];

-- Backfill existing rows (assume previous hoovers involved are equivalent to members involved)
UPDATE war_logs
SET members_involved = COALESCE(members_involved, '{}'::TEXT[])
WHERE members_involved IS NULL;
