-- Drop existing constraints and indexes
ALTER TABLE leaves DROP CONSTRAINT leaves_pkey CASCADE;
ALTER TABLE leaves ALTER COLUMN id DROP DEFAULT;

-- Create a new sequence for the ID
CREATE SEQUENCE leaves_id_seq;

-- Update the ID column to use the sequence
ALTER TABLE leaves ALTER COLUMN id TYPE INTEGER USING (nextval('leaves_id_seq')::integer);
ALTER SEQUENCE leaves_id_seq OWNED BY leaves.id;

-- Recreate primary key
ALTER TABLE leaves ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_leaves_requested_for_discord_id ON leaves(requested_for_discord_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status_created_at ON leaves(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves(start_date, end_date);
