-- Create login_logs table
CREATE TABLE IF NOT EXISTS public.login_logs (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_logs_discord_id ON public.login_logs(discord_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON public.login_logs(login_time);

-- Create function to log logins
CREATE OR REPLACE FUNCTION public.log_login(
    p_discord_id TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT
) 
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.login_logs (discord_id, ip_address, user_agent)
    VALUES (p_discord_id, p_ip_address, p_user_agent);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_login TO authenticated, service_role;
GRANT SELECT, INSERT ON public.login_logs TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.login_logs_id_seq TO authenticated, service_role;
