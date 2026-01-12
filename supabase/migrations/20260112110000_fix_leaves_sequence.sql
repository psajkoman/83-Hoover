-- Fix sequence for leaves table ID

-- First drop any existing default value and sequence
ALTER TABLE leaves ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS leaves_id_seq;

-- Create a new sequence
CREATE SEQUENCE leaves_id_seq;

-- Set the column to use the sequence as default
ALTER TABLE leaves ALTER COLUMN id SET DEFAULT nextval('leaves_id_seq'::regclass);

-- Make the sequence owned by the column
ALTER SEQUENCE leaves_id_seq OWNED BY leaves.id;

-- Set the sequence to the next available ID
SELECT setval('leaves_id_seq', COALESCE((SELECT MAX(id) FROM leaves), 1));

-- Verify the sequence is working
SELECT nextval('leaves_id_seq');
