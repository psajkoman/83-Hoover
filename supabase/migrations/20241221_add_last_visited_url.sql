-- Add last_visited_url column to login_history
ALTER TABLE public.login_history 
ADD COLUMN IF NOT EXISTS last_visited_url TEXT;

-- Update the comment for the table to include the new column
COMMENT ON COLUMN public.login_history.last_visited_url IS 'Last visited URL during the session';
