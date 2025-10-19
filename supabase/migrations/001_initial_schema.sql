-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'LEADER', 'MODERATOR', 'MEMBER', 'GUEST');
CREATE TYPE post_type AS ENUM ('ANNOUNCEMENT', 'SCREENSHOT', 'WORD_ON_STREET', 'ATTACK_LOG', 'DEFENSE_LOG', 'GRAFFITI', 'MEDIA', 'GENERAL');
CREATE TYPE log_type AS ENUM ('TURF_WAR', 'ROBBERY', 'DRUG_DEAL', 'MEETING', 'RECRUITMENT', 'ALLIANCE', 'CONFLICT', 'OTHER');
CREATE TYPE event_type AS ENUM ('MEETING', 'OPERATION', 'RECRUITMENT', 'PARTY', 'TRAINING', 'OTHER');
CREATE TYPE turf_status AS ENUM ('CONTROLLED', 'CONTESTED', 'NEUTRAL', 'LOST');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  discriminator TEXT,
  avatar TEXT,
  email TEXT,
  role user_role DEFAULT 'MEMBER',
  rank TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type post_type NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_ic BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  discord_message_id TEXT UNIQUE,
  discord_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs table
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type log_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  participants TEXT[] DEFAULT '{}',
  outcome TEXT,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type event_type NOT NULL,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turf zones table
CREATE TABLE turf_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL,
  status turf_status DEFAULT 'CONTROLLED',
  controlled_by TEXT,
  contested_by TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turf history table
CREATE TABLE turf_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES turf_zones(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  faction TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook config table
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  post_type post_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_type_created ON posts(type, created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(is_pinned, created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_logs_type_timestamp ON logs(type, timestamp DESC);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_turf_history_zone ON turf_history(zone_id, timestamp DESC);
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_last_active ON users(last_active DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = discord_id);

-- RLS Policies for posts
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text));
CREATE POLICY "Users can delete own posts or admins can delete any" ON posts FOR DELETE USING (
  author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
  OR
  EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND role IN ('ADMIN', 'LEADER', 'MODERATOR'))
);

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text));

-- RLS Policies for logs
CREATE POLICY "Logs are viewable by everyone" ON logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create logs" ON logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Event creators can update their events" ON events FOR UPDATE USING (creator_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text));

-- RLS Policies for turf
CREATE POLICY "Turf zones are viewable by everyone" ON turf_zones FOR SELECT USING (true);
CREATE POLICY "Admins can manage turf zones" ON turf_zones FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND role IN ('ADMIN', 'LEADER'))
);

-- RLS Policies for turf history
CREATE POLICY "Turf history is viewable by everyone" ON turf_history FOR SELECT USING (true);

-- RLS Policies for webhook configs (admin only)
CREATE POLICY "Admins can manage webhooks" ON webhook_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND role = 'ADMIN')
);

-- RLS Policies for settings (admin only)
CREATE POLICY "Settings are viewable by everyone" ON settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND role = 'ADMIN')
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_turf_zones_updated_at BEFORE UPDATE ON turf_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_configs_updated_at BEFORE UPDATE ON webhook_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
