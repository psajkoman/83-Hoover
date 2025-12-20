-- Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
  discord_id TEXT NOT NULL,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  username TEXT,
  
  -- Composite primary key
  PRIMARY KEY (discord_id, login_time),
  -- Add foreign key constraint to users.discord_id
  CONSTRAINT fk_discord_id FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

-- Create index on discord_id for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_discord_id ON public.login_history(discord_id);

-- Create index on login_time for time-based queries
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON public.login_history(login_time);

-- Enable Row Level Security
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Enable read access for authenticated users"
  ON public.login_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.login_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment for the table
COMMENT ON TABLE public.login_history IS 'Stores user login history with device information';

-- Add comments for columns
COMMENT ON COLUMN public.login_history.discord_id IS 'Discord user ID';
COMMENT ON COLUMN public.login_history.login_time IS 'Timestamp when the login occurred';
COMMENT ON COLUMN public.login_history.user_agent IS 'User agent string from the login request';
COMMENT ON COLUMN public.login_history.username IS 'Discord username at the time of login';
