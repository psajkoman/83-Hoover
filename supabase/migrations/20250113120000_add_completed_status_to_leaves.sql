-- Add COMPLETED status to leave_status enum
ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Add ended_at and ended_by columns to track manual LOA completion
ALTER TABLE leaves 
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES users(id) ON DELETE SET NULL;
