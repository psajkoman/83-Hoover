-- Function to increment message count
CREATE OR REPLACE FUNCTION public.increment_message_count(
  p_user_id TEXT,
  p_user_name TEXT,
  p_channel_id TEXT,
  p_channel_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.messages (
    user_id,
    user_name,
    channel_id,
    channel_name,
    message_count,
    last_message_at
  )
  VALUES (
    p_user_id,
    p_user_name,
    p_channel_id,
    p_channel_name,
    1,
    NOW()
  )
  ON CONFLICT (user_id, channel_id)
  DO UPDATE SET
    message_count = messages.message_count + 1,
    user_name = EXCLUDED.user_name,
    channel_name = EXCLUDED.channel_name,
    last_message_at = NOW()
  RETURNING to_jsonb(messages.*) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get message leaderboard
CREATE OR REPLACE FUNCTION public.get_message_leaderboard(
  p_limit INTEGER DEFAULT 10,
  p_channel_id TEXT DEFAULT NULL
) RETURNS TABLE (
  user_id TEXT,
  user_name TEXT,
  message_count BIGINT,
  channel_id TEXT,
  channel_name TEXT,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.user_id,
    m.user_name,
    SUM(m.message_count)::BIGINT as message_count,
    m.channel_id,
    m.channel_name,
    MAX(m.last_message_at) as last_message_at
  FROM 
    public.messages m
  WHERE
    (p_channel_id IS NULL OR m.channel_id = p_channel_id)
  GROUP BY 
    m.user_id, m.user_name, m.channel_id, m.channel_name
  ORDER BY 
    message_count DESC,
    last_message_at DESC
  LIMIT p_limit;
END;
$$;
