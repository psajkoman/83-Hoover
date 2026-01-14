-- First, add a temporary text column to store the new status values
ALTER TABLE leaves ADD COLUMN status_temp TEXT;

-- Map old statuses to new statuses
UPDATE leaves SET status_temp = 
  CASE 
    WHEN status::text = 'OPEN' THEN 'AWAY'
    WHEN status::text = 'COMPLETED' THEN 'RETURNED'
    WHEN status::text = 'DENIED' THEN 'DENIED'
    WHEN status::text = 'PENDING' THEN 'DENIED'
    WHEN status::text = 'APPROVED' THEN 'AWAY'
    WHEN status::text = 'AUTO_DENIED' THEN 'DENIED'
    ELSE 'DENIED' -- Fallback for any unexpected values
  END;

-- Drop the existing status column
ALTER TABLE leaves DROP COLUMN status;

-- Recreate the enum with only allowed values
DROP TYPE IF EXISTS leave_status;
CREATE TYPE leave_status AS ENUM ('AWAY', 'RETURNED', 'DENIED');

-- Add the status column back with the new enum type
ALTER TABLE leaves 
  ADD COLUMN status leave_status NOT NULL DEFAULT 'DENIED';

-- Copy the values from the temporary column
UPDATE leaves SET status = status_temp::leave_status;

-- Drop the temporary column
ALTER TABLE leaves DROP COLUMN status_temp;
