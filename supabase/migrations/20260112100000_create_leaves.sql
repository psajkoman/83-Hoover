-- Leaves of Absence

-- Enum for leave status
DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'AUTO_DENIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who the leave is for (not necessarily the creator)
  requested_for_name TEXT NOT NULL,
  requested_for_discord_id TEXT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  note TEXT NULL,

  status leave_status NOT NULL DEFAULT 'PENDING',

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_discord_id TEXT NULL,

  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NULL,
  decision_note TEXT NULL,

  admin_override BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_requested_for_discord_id ON leaves(requested_for_discord_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status_created_at ON leaves(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves(start_date, end_date);

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view leaves
CREATE POLICY "Leaves are viewable by authenticated users" ON leaves
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to create leaves
CREATE POLICY "Authenticated users can create leaves" ON leaves
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins/leaders/mods can update/decide leaves
CREATE POLICY "Admins can update leaves" ON leaves
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE discord_id = auth.uid()::text
        AND role IN ('ADMIN', 'LEADER', 'MODERATOR')
    )
  );

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
