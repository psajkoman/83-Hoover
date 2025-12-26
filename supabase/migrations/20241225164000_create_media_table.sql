-- Create media table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);

-- Add RLS policies for media table
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all media
CREATE POLICY "Enable read access for all users" 
ON public.media 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert their own media
CREATE POLICY "Enable insert for authenticated users"
ON public.media
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own media
CREATE POLICY "Enable update for media owner"
ON public.media
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own media
CREATE POLICY "Enable delete for media owner"
ON public.media
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON public.media
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
