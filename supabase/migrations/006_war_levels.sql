-- Add war level to faction_wars
ALTER TABLE faction_wars
ADD COLUMN IF NOT EXISTS war_level VARCHAR(50) DEFAULT 'NON_LETHAL' CHECK (war_level IN ('NON_LETHAL', 'LETHAL'));
