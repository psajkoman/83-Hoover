# ✅ Authentication Fix Complete!

## Problem Solved

When users logged in with Discord through NextAuth, they weren't being created in the Supabase database. This caused issues when trying to access admin pages or any features that required a user record.

## Solution Applied

Updated `lib/auth.ts` to automatically create/update users in Supabase when they sign in with Discord.

## What Changed

### Added Supabase Admin Client
```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Added signIn Callback
The callback now:
1. **Checks** if user exists in Supabase
2. **Creates** new user if they don't exist (with role: 'MEMBER')
3. **Updates** existing user's info (username, avatar, last_active)

```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === 'discord' && profile) {
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('discord_id', profile.id)
      .single()

    if (!existingUser) {
      // Create new user with default MEMBER role
      await supabaseAdmin.from('users').insert({
        discord_id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        email: profile.email,
        role: 'MEMBER',
      })
    } else {
      // Update existing user
      await supabaseAdmin
        .from('users')
        .update({
          username: profile.username,
          avatar: profile.avatar,
          last_active: new Date().toISOString(),
        })
        .eq('discord_id', profile.id)
    }
  }
  return true
}
```

## How It Works Now

### 1. User Logs In
- User clicks "Sign in with Discord"
- Discord OAuth flow completes
- NextAuth receives user profile from Discord

### 2. Automatic User Creation
- **signIn callback** runs automatically
- Checks if user exists in Supabase `users` table
- If **new user**: Creates record with role `MEMBER`
- If **existing user**: Updates username, avatar, last_active

### 3. User Can Access App
- User now exists in Supabase database
- Can access pages that require authentication
- Can be promoted to ADMIN manually

## Making Someone an Admin

### Option 1: Supabase Dashboard
1. Go to Supabase → **Table Editor** → **users**
2. Find the user by their Discord username
3. Click on their row
4. Change `role` from `MEMBER` to `ADMIN`
5. Save

### Option 2: SQL Query
```sql
UPDATE users 
SET role = 'ADMIN' 
WHERE discord_id = 'DISCORD_ID_HERE';
```

## Environment Variables Required

Make sure your `.env.local` has:

```env
# Supabase (Required for user creation)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Discord OAuth (Required)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret

# NextAuth (Required)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Testing

### 1. Rebuild the App
```bash
npm run build
```

### 2. Start the Server
```bash
npm start
```

### 3. Sign In
1. Go to http://localhost:3000/auth/signin
2. Click "Sign in with Discord"
3. Complete Discord OAuth
4. You'll be redirected back

### 4. Check Supabase
1. Go to Supabase Dashboard
2. Open **Table Editor** → **users**
3. You should see your user created automatically! ✅

### 5. Make Yourself Admin
1. Find your user in the table
2. Change `role` to `ADMIN`
3. Save

### 6. Access Admin Dashboard
1. Go to http://localhost:3000/admin
2. You should see the admin dashboard! 🎉

## What Gets Stored

When a user signs in, we store:
- ✅ `discord_id` - Their Discord ID
- ✅ `username` - Discord username
- ✅ `discriminator` - Discord discriminator (#1234)
- ✅ `avatar` - Discord avatar hash
- ✅ `email` - Discord email
- ✅ `role` - Default: `MEMBER` (change to `ADMIN` manually)
- ✅ `joined_at` - When they first signed up
- ✅ `last_active` - Updates every login

## Roles Available

- **GUEST** - Read-only access
- **MEMBER** - Can post and comment
- **MODERATOR** - Can moderate content
- **LEADER** - Can manage members
- **ADMIN** - Full access to everything

## Benefits

✅ **Automatic user creation** - No manual setup needed
✅ **Profile sync** - Username and avatar stay up to date
✅ **Last active tracking** - Know when users were last online
✅ **Role-based access** - Control who can do what
✅ **Works with all features** - Posts, comments, admin, etc.

## Next Steps

1. ✅ Rebuild: `npm run build`
2. ✅ Start: `npm start`
3. ✅ Sign in with Discord
4. ✅ Check Supabase - user should be there!
5. ✅ Change your role to ADMIN
6. ✅ Access `/admin` dashboard

---

**Authentication is now fully integrated with Supabase!** 🎉
