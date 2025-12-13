-- Add slug to faction_wars for human-readable URLs

ALTER TABLE faction_wars
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_faction_wars_slug_unique ON faction_wars(slug);

-- Backfill existing rows (enemy_faction + YYYYMM from started_at)
UPDATE faction_wars
SET slug = LOWER(REGEXP_REPLACE(TRIM(enemy_faction), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || TO_CHAR(started_at AT TIME ZONE 'UTC', 'YYYYMM')
WHERE slug IS NULL;
