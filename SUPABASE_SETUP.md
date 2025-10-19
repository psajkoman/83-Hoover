# 🚀 Supabase Setup Guide

This guide will help you set up Supabase for the 83 Hoover Faction Hub.

## Why Supabase?

- **Free tier** with generous limits
- **PostgreSQL** database (more reliable than MongoDB for this use case)
- **Built-in authentication** with Discord OAuth
- **Real-time subscriptions** (can replace Pusher if needed)
- **Row Level Security** for data protection
- **Easy deployment** with Vercel

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** and sign up
3. Click **"New Project"**
4. Fill in project details:
   - **Name**: `83-hoover-hub`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

---

## Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

---

## Step 3: Run Database Migration

### Option A: Using Supabase Dashboard (Easiest)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. You should see "Success. No rows returned"

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

---

## Step 4: Configure Discord OAuth in Supabase

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create or select your application
3. Go to **OAuth2** → **General**
4. Add redirect URL:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
5. Copy **Client ID** and **Client Secret**

6. In Supabase dashboard, go to **Authentication** → **Providers**
7. Enable **Discord**
8. Paste your Discord **Client ID** and **Client Secret**
9. Click **Save**

---

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Discord (for additional features)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_GUILD_ID="your-server-guild-id"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Pusher (Real-time)
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="your-cluster"

# App Config
NEXT_PUBLIC_FACTION_NAME="83 Hoover Criminals"
NEXT_PUBLIC_FACTION_COLOR="#e94560"
```

---

## Step 6: Install Dependencies

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `@supabase/auth-helpers-nextjs` - Next.js authentication helpers
- All other dependencies

---

## Step 7: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Click **"Sign In with Discord"**

4. Authorize the application

5. Check Supabase dashboard → **Authentication** → **Users**
   - You should see your user created!

6. Check **Table Editor** → **users**
   - Your user data should be there

---

## Step 8: Create Your First Admin User

After signing in for the first time:

1. Go to Supabase dashboard → **Table Editor** → **users**
2. Find your user row
3. Click to edit
4. Change `role` from `MEMBER` to `ADMIN`
5. Click **Save**
6. Refresh your app - you should now have admin access!

---

## Database Structure

Your database now has these tables:

- **users** - User profiles and roles
- **posts** - Feed posts with media
- **comments** - Post comments
- **logs** - Activity logs (turf wars, etc.)
- **events** - Scheduled faction events
- **turf_zones** - Territory control map
- **turf_history** - Territory change history
- **webhook_configs** - Discord webhook settings
- **settings** - App configuration

---

## Row Level Security (RLS)

The database has built-in security policies:

✅ **Public Read**: Everyone can view posts, users, events, turf
✅ **Authenticated Write**: Logged-in users can create content
✅ **Owner Edit**: Users can only edit their own content
✅ **Admin Override**: Admins can moderate all content

---

## Optional: Enable Supabase Realtime (Replace Pusher)

Supabase has built-in real-time subscriptions. To use instead of Pusher:

1. In Supabase dashboard, go to **Database** → **Replication**
2. Enable replication for these tables:
   - `posts`
   - `comments`
   - `turf_zones`

3. Update your code to use Supabase realtime:
   ```typescript
   const channel = supabase
     .channel('posts')
     .on('postgres_changes', 
       { event: 'INSERT', schema: 'public', table: 'posts' },
       (payload) => {
         console.log('New post!', payload)
       }
     )
     .subscribe()
   ```

---

## Troubleshooting

### Error: "Invalid API key"
- Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure there are no extra spaces or quotes

### Error: "Discord OAuth failed"
- Verify redirect URL in Discord matches Supabase exactly
- Check Discord Client ID and Secret in Supabase settings

### Error: "Row Level Security policy violation"
- Make sure you ran the full migration SQL
- Check that RLS policies are enabled in Supabase

### Error: "Table does not exist"
- Run the migration SQL again
- Check **Table Editor** to verify tables were created

---

## Useful Supabase Features

### SQL Editor
Run custom queries and view results

### Table Editor
Visual interface to view/edit data

### Authentication
Manage users, configure providers

### Storage
Upload and serve files (alternative to Cloudinary)

### Database Backups
Automatic daily backups on paid plans

### API Docs
Auto-generated API documentation for your database

---

## Free Tier Limits

- **Database**: 500 MB storage
- **Bandwidth**: 5 GB/month
- **API Requests**: Unlimited
- **Authentication**: 50,000 MAUs
- **Storage**: 1 GB

Perfect for small to medium factions! 🎉

---

## Upgrade Path

If you outgrow the free tier:

- **Pro Plan**: $25/month
  - 8 GB database
  - 50 GB bandwidth
  - Daily backups
  - Email support

---

## Next Steps

1. ✅ Complete this setup
2. ✅ Create your first post
3. ✅ Invite faction members
4. ✅ Configure Discord webhooks
5. ✅ Deploy to Vercel

---

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](your-repo-url/issues)

---

**You're all set with Supabase! 🚀**
