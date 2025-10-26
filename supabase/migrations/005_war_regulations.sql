-- War Regulations System

-- Drop existing triggers and functions if they exist (for re-running migration)
DROP TRIGGER IF EXISTS trigger_add_to_pk_list ON war_logs;
DROP TRIGGER IF EXISTS trigger_remove_from_pk_list ON war_logs;
DROP FUNCTION IF EXISTS add_players_to_pk_list() CASCADE;
DROP FUNCTION IF EXISTS remove_players_from_pk_list() CASCADE;

-- Add log_type to war_logs
ALTER TABLE war_logs 
ADD COLUMN IF NOT EXISTS log_type VARCHAR(50) DEFAULT 'ATTACK' CHECK (log_type IN ('ATTACK', 'DEFENSE'));

-- Add war type and regulations to faction_wars
ALTER TABLE faction_wars 
ADD COLUMN war_type VARCHAR(50) DEFAULT 'UNCONTROLLED' CHECK (war_type IN ('UNCONTROLLED', 'CONTROLLED')),
ADD COLUMN regulations JSONB DEFAULT '{
  "attacking_cooldown_hours": 6,
  "pk_cooldown_type": "permanent",
  "pk_cooldown_days": null,
  "max_participants": 4,
  "max_assault_rifles": 2,
  "weapon_restrictions": "Max 2 assault rifles, rest allowed"
}'::jsonb;

-- Create global_war_regulations table for uncontrolled war defaults
CREATE TABLE IF NOT EXISTS global_war_regulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacking_cooldown_hours INTEGER DEFAULT 6,
  pk_cooldown_type VARCHAR(50) DEFAULT 'permanent' CHECK (pk_cooldown_type IN ('permanent', 'days')),
  pk_cooldown_days INTEGER,
  max_participants INTEGER DEFAULT 4,
  max_assault_rifles INTEGER DEFAULT 2,
  weapon_restrictions TEXT DEFAULT 'Max 2 assault rifles, rest allowed',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Insert default global regulations
INSERT INTO global_war_regulations (
  attacking_cooldown_hours,
  pk_cooldown_type,
  pk_cooldown_days,
  max_participants,
  max_assault_rifles,
  weapon_restrictions
) VALUES (6, 'permanent', NULL, 4, 2, 'Max 2 assault rifles, rest allowed');

-- Create player_kill_list table
CREATE TABLE IF NOT EXISTS player_kill_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  war_id UUID REFERENCES faction_wars(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  faction VARCHAR(50) NOT NULL CHECK (faction IN ('HOOVER', 'ENEMY')), -- Which faction this player belongs to
  discord_id VARCHAR(255), -- NULL if not in our Discord
  kill_count INTEGER DEFAULT 1, -- Track how many times killed
  last_killed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  added_via VARCHAR(50) DEFAULT 'LOG' CHECK (added_via IN ('LOG', 'MANUAL')), -- LOG = from war log, MANUAL = admin added
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(war_id, player_name, faction)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_kill_list_war_id ON player_kill_list(war_id);
CREATE INDEX IF NOT EXISTS idx_player_kill_list_discord_id ON player_kill_list(discord_id);
CREATE INDEX IF NOT EXISTS idx_player_kill_list_killed_at ON player_kill_list(last_killed_at DESC);

-- Enable RLS
ALTER TABLE global_war_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_kill_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on global_war_regulations"
  ON global_war_regulations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on player_kill_list"
  ON player_kill_list FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to automatically add players to PK list from war logs
CREATE OR REPLACE FUNCTION add_players_to_pk_list()
RETURNS TRIGGER AS $$
DECLARE
  v_player_name TEXT;
  v_hoover_name TEXT;
  v_clean_name TEXT;
  v_discord_id TEXT;
BEGIN
  -- Add enemy players killed (by us)
  FOREACH v_player_name IN ARRAY NEW.players_killed
  LOOP
    v_discord_id := NULL; -- Reset for each iteration
    
    -- If name starts with @, force Discord lookup only
    IF v_player_name LIKE '@%' THEN
      v_clean_name := SUBSTRING(v_player_name FROM 2);
      
      -- Try to find Discord user by username (case-insensitive)
      SELECT discord_id INTO v_discord_id
      FROM users
      WHERE LOWER(username) = LOWER(v_clean_name)
      LIMIT 1;
    ELSE
      -- No @ symbol: try to find Discord user first
      v_clean_name := v_player_name;
      
      -- Try to find Discord user by username (case-insensitive)
      SELECT discord_id INTO v_discord_id
      FROM users
      WHERE LOWER(username) = LOWER(v_clean_name)
      LIMIT 1;
      
      -- If not found, treat as RP name (discord_id stays NULL)
    END IF;
    
    INSERT INTO player_kill_list (war_id, player_name, faction, discord_id, added_by, added_via, last_killed_at, kill_count)
    VALUES (NEW.war_id, v_clean_name, 'ENEMY', v_discord_id, NEW.submitted_by, 'LOG', NEW.date_time, 1)
    ON CONFLICT (war_id, player_name, faction) 
    DO UPDATE SET 
      kill_count = player_kill_list.kill_count + 1,
      last_killed_at = NEW.date_time,
      discord_id = COALESCE(EXCLUDED.discord_id, player_kill_list.discord_id);
  END LOOP;
  
  -- Add our hoovers involved (killed by them, if it's a defense)
  IF NEW.log_type = 'DEFENSE' THEN
    FOREACH v_hoover_name IN ARRAY NEW.hoovers_involved
    LOOP
      v_discord_id := NULL; -- Reset for each iteration
      
      -- If name starts with @, force Discord lookup only
      IF v_hoover_name LIKE '@%' THEN
        v_clean_name := SUBSTRING(v_hoover_name FROM 2);
        
        -- Try to find Discord user by username (case-insensitive)
        SELECT discord_id INTO v_discord_id
        FROM users
        WHERE LOWER(username) = LOWER(v_clean_name)
        LIMIT 1;
      ELSE
        -- No @ symbol: try to find Discord user first
        v_clean_name := v_hoover_name;
        
        -- Try to find Discord user by username (case-insensitive)
        SELECT discord_id INTO v_discord_id
        FROM users
        WHERE LOWER(username) = LOWER(v_clean_name)
        LIMIT 1;
        
        -- If not found, treat as RP name (discord_id stays NULL)
      END IF;
      
      INSERT INTO player_kill_list (war_id, player_name, faction, discord_id, added_by, added_via, last_killed_at, kill_count)
      VALUES (NEW.war_id, v_clean_name, 'HOOVER', v_discord_id, NEW.submitted_by, 'LOG', NEW.date_time, 1)
      ON CONFLICT (war_id, player_name, faction) 
      DO UPDATE SET 
        kill_count = player_kill_list.kill_count + 1,
        last_killed_at = NEW.date_time,
        discord_id = COALESCE(EXCLUDED.discord_id, player_kill_list.discord_id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add players to PK list when war log is created
DROP TRIGGER IF EXISTS trigger_add_to_pk_list ON war_logs;
CREATE TRIGGER trigger_add_to_pk_list
AFTER INSERT ON war_logs
FOR EACH ROW
EXECUTE FUNCTION add_players_to_pk_list();

-- Create trigger to update PK list when war log is updated
DROP TRIGGER IF EXISTS trigger_update_pk_list ON war_logs;
CREATE TRIGGER trigger_update_pk_list
AFTER UPDATE ON war_logs
FOR EACH ROW
EXECUTE FUNCTION add_players_to_pk_list();

-- Function to remove players from PK list when war log is deleted
CREATE OR REPLACE FUNCTION remove_players_from_pk_list()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete PK list entries that were added via this log
  DELETE FROM player_kill_list
  WHERE war_id = OLD.war_id
  AND player_name = ANY(OLD.players_killed)
  AND added_via = 'LOG'
  AND last_killed_at = OLD.date_time;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to remove players from PK list when war log is deleted
-- DISABLED: PK list is now calculated dynamically from war logs
-- DROP TRIGGER IF EXISTS trigger_remove_from_pk_list ON war_logs;
-- CREATE TRIGGER trigger_remove_from_pk_list
-- AFTER DELETE ON war_logs
-- FOR EACH ROW
-- EXECUTE FUNCTION remove_players_from_pk_list();
