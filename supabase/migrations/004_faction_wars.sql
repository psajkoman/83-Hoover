-- Faction Wars System

-- Create faction_wars table
CREATE TABLE IF NOT EXISTS faction_wars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enemy_faction VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create war_logs table
CREATE TABLE IF NOT EXISTS war_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  war_id UUID REFERENCES faction_wars(id) ON DELETE CASCADE,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  log_type VARCHAR(50) DEFAULT 'ATTACK' CHECK (log_type IN ('ATTACK', 'DEFENSE')),
  hoovers_involved TEXT[] NOT NULL, -- Array of Discord usernames
  players_killed TEXT[] NOT NULL, -- Array of enemy player names
  notes TEXT,
  evidence_url TEXT,
  submitted_by UUID REFERENCES users(id),
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faction_wars_status ON faction_wars(status);
CREATE INDEX IF NOT EXISTS idx_faction_wars_started_at ON faction_wars(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_war_logs_war_id ON war_logs(war_id);
CREATE INDEX IF NOT EXISTS idx_war_logs_date_time ON war_logs(date_time DESC);

-- Enable RLS
ALTER TABLE faction_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faction_wars
-- Allow all operations since we handle permissions in the API layer
CREATE POLICY "Allow all operations on faction_wars"
  ON faction_wars FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for war_logs
-- Allow all operations since we handle permissions in the API layer
CREATE POLICY "Allow all operations on war_logs"
  ON war_logs FOR ALL
  USING (true)
  WITH CHECK (true);
