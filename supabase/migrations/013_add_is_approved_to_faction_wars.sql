-- Add is_approved column to faction_wars table
ALTER TABLE faction_wars 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Update existing records to be approved by default
UPDATE faction_wars SET is_approved = TRUE WHERE status = 'ACTIVE';

-- Update the status check constraint to include PENDING status
ALTER TABLE faction_wars 
DROP CONSTRAINT IF EXISTS faction_wars_status_check;

ALTER TABLE faction_wars 
ADD CONSTRAINT faction_wars_status_check 
CHECK (status IN ('PENDING', 'ACTIVE', 'ENDED'));
