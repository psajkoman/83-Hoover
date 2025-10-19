# ⚡ Quick Start Guide

Get your 83 Hoover Faction Hub running in 10 minutes!

## Step 1: Install Dependencies (2 min)

```bash
cd 83-hoover
npm install
```

## Step 2: Create Supabase Project (3 min)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Name it `83-hoover-hub`
4. Choose a region and generate a password
5. Wait for project to be created

## Step 3: Run Database Migration (1 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy ALL contents from `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"

## Step 4: Get API Keys (1 min)

In Supabase dashboard, go to **Settings** → **API**:
- Copy **Project URL**
- Copy **anon public** key
- Copy **service_role** key

## Step 5: Configure Environment (2 min)

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL="paste-your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="paste-your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key"

# Get these from Discord Developer Portal
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_GUILD_ID="your-server-guild-id"

# Optional: Add Cloudinary and Pusher later
```

## Step 6: Configure Discord OAuth (1 min)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create/select your application
3. Go to **OAuth2** → Add redirect:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
4. Copy Client ID and Secret

5. In Supabase dashboard, go to **Authentication** → **Providers**
6. Enable **Discord** and paste your credentials

## Step 7: Run the App! (30 sec)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 8: Create Admin User (30 sec)

1. Click "Sign In with Discord"
2. Authorize the app
3. Go to Supabase → **Table Editor** → **users**
4. Find your user, change `role` to `ADMIN`
5. Refresh the app

## 🎉 You're Done!

Your faction hub is now running!

## Next Steps

- Add Cloudinary for media uploads
- Add Pusher for real-time updates
- Invite faction members
- Deploy to Vercel

## Need Help?

- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions
- Check [README.md](./README.md) for full documentation
- Open an issue on GitHub

---

**Welcome to 83 Hoover! 🎮**
# ⚡ Quick Start Guide

Get your 83 Hoover Faction Hub running in 10 minutes!

## Step 1: Install Dependencies (2 min)

```bash
cd 83-hoover
npm install
```

## Step 2: Create Supabase Project (3 min)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Name it `83-hoover-hub`
4. Choose a region and generate a password
5. Wait for project to be created

## Step 3: Run Database Migration (1 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy ALL contents from `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"

## Step 4: Get API Keys (1 min)

In Supabase dashboard, go to **Settings** → **API**:
- Copy **Project URL**
- Copy **anon public** key
- Copy **service_role** key

## Step 5: Configure Environment (2 min)

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL="paste-your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="paste-your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key"

# Get these from Discord Developer Portal
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_GUILD_ID="your-server-guild-id"

# Optional: Add Cloudinary and Pusher later
```

## Step 6: Configure Discord OAuth (1 min)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create/select your application
3. Go to **OAuth2** → Add redirect:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
4. Copy Client ID and Secret

5. In Supabase dashboard, go to **Authentication** → **Providers**
6. Enable **Discord** and paste your credentials

## Step 7: Run the App! (30 sec)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 8: Create Admin User (30 sec)

1. Click "Sign In with Discord"
2. Authorize the app
3. Go to Supabase → **Table Editor** → **users**
4. Find your user, change `role` to `ADMIN`
5. Refresh the app

## 🎉 You're Done!

Your faction hub is now running!

## Next Steps

- Add Cloudinary for media uploads
- Add Pusher for real-time updates
- Invite faction members
- Deploy to Vercel

## Need Help?

- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions
- Check [README.md](./README.md) for full documentation
- Open an issue on GitHub

---

**Welcome to 83 Hoover! 🎮**
