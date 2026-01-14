-- First, drop the constraint if it exists
ALTER TABLE IF EXISTS leaves DROP CONSTRAINT IF EXISTS leaves_status_check;

-- Add a temporary column to store the new status values
ALTER TABLE IF EXISTS leaves ADD COLUMN IF NOT EXISTS status_new TEXT;

-- Map old statuses to new statuses
UPDATE leaves SET status_new = 
  CASE 
    WHEN status = 'APPROVED' THEN 'OPEN'
    WHEN status = 'AUTO_DENIED' THEN 'DENIED'
    WHEN status = 'COMPLETED' THEN 'COMPLETED'
    WHEN status = 'DENIED' THEN 'DENIED'
    WHEN status = 'PENDING' THEN 'DENIED' -- Convert PENDING to DENIED
    ELSE 'OPEN' -- Default to OPEN for any other status
  END;

-- Drop the old status column if it exists
ALTER TABLE IF EXISTS leaves DROP COLUMN IF EXISTS status;

-- Create the new enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('OPEN', 'DENIED', 'COMPLETED');
    END IF;
END$$;

-- Add the column back with the new type
ALTER TABLE IF EXISTS leaves ADD COLUMN IF NOT EXISTS status leave_status NOT NULL DEFAULT 'OPEN';

-- Copy the converted values
UPDATE leaves SET status = status_new::leave_status
WHERE status_new IS NOT NULL;

-- Recreate the check constraint
ALTER TABLE IF EXISTS leaves 
  ADD CONSTRAINT leaves_status_check 
  CHECK (status IN ('OPEN', 'DENIED', 'COMPLETED'));

-- Set default value
ALTER TABLE IF EXISTS leaves ALTER COLUMN status SET DEFAULT 'OPEN';

-- Drop the temporary column
ALTER TABLE IF EXISTS leaves DROP COLUMN IF EXISTS status_new;
