# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Checks

### 1. Build Verification
- ✅ **Local build succeeds**: `npm run build` completes without errors
- ✅ **All TypeScript errors resolved**
- ✅ **ESLint warnings reviewed** (only img warning remaining - safe to ignore)

### 2. Environment Variables Required

**Critical - Must be set in Vercel:**

#### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### NextAuth (Required for Discord login)
```
NEXTAUTH_SECRET=your-random-secret-32-chars-minimum
NEXTAUTH_URL=https://your-domain.vercel.app
```

#### Discord OAuth (Required)
```
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_GUILD_ID=your-guild-id (optional)
```

#### Optional Services
```
# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Pusher (for real-time updates)
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster
NEXT_PUBLIC_PUSHER_APP_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster

# Discord Webhook (for auto-import)
DISCORD_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🔧 Potential Runtime Issues

### Issue 1: Missing Environment Variables
**Symptom:** App crashes on load or certain features don't work
**Solution:** Verify all required env vars are set in Vercel dashboard

### Issue 2: Discord OAuth Redirect URI
**Symptom:** "invalid_redirect_uri" error when logging in
**Solution:** 
1. Go to Discord Developer Portal
2. Add your Vercel URL: `https://your-app.vercel.app/api/auth/callback/discord`
3. Also add: `https://your-custom-domain.com/api/auth/callback/discord` (if using custom domain)

### Issue 3: Supabase RLS Policies
**Symptom:** "permission denied" errors when accessing data
**Solution:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Ensure RLS policies allow:
   - Public read for posts
   - Authenticated users can insert/update their own data
   - Admins can do everything

### Issue 4: CORS Issues
**Symptom:** API calls fail from frontend
**Solution:** Already handled - Next.js API routes don't have CORS issues

### Issue 5: Pusher/Cloudinary Not Configured
**Symptom:** Real-time updates don't work, image uploads fail
**Solution:** These are optional - app will work without them, just with reduced features

---

## 📋 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 3. Configure Environment Variables
1. In Vercel project settings → Environment Variables
2. Add all required variables from above
3. Make sure to add them for **Production**, **Preview**, and **Development**

### 4. Update Discord OAuth
1. Go to Discord Developer Portal
2. Add Vercel URL to OAuth2 Redirects:
   - `https://your-app.vercel.app/api/auth/callback/discord`

### 5. Update NEXTAUTH_URL
In Vercel env vars, set:
```
NEXTAUTH_URL=https://your-app.vercel.app
```

### 6. Deploy
Click "Deploy" in Vercel - it will:
- Install dependencies
- Run `npm run build`
- Deploy to production

---

## 🧪 Post-Deployment Testing

### Test Checklist:
- [ ] Homepage loads
- [ ] Can navigate to /auth/signin
- [ ] Discord OAuth works (redirects correctly)
- [ ] User is created in Supabase after login
- [ ] Can access /admin after changing role to ADMIN
- [ ] Posts page loads (/gallery)
- [ ] Turf map loads (/turf)
- [ ] API routes respond (check Network tab)

---

## 🐛 Common Vercel-Specific Issues

### 1. "Module not found" errors
**Cause:** Case-sensitive imports (Vercel is case-sensitive, Windows is not)
**Solution:** Check all imports match exact file names

### 2. Build succeeds but runtime errors
**Cause:** Missing environment variables
**Solution:** Double-check all env vars in Vercel dashboard

### 3. "Cannot read property of undefined"
**Cause:** Trying to access env vars that don't exist
**Solution:** Add fallbacks or check existence:
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!url) throw new Error('Missing SUPABASE_URL')
```

### 4. Infinite redirects
**Cause:** Auth middleware redirecting incorrectly
**Solution:** Check middleware.ts and auth callbacks

### 5. Database connection fails
**Cause:** Wrong Supabase URL or keys
**Solution:** Verify credentials in Vercel match Supabase dashboard

---

## 📊 Files That Need Environment Variables

### Critical Files:
1. **`lib/auth.ts`** - Needs:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`

2. **`lib/supabase/client.ts`** - Needs:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **`lib/supabase/server.ts`** - Needs:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **`lib/pusher.ts`** - Needs (optional):
   - `PUSHER_APP_ID`
   - `NEXT_PUBLIC_PUSHER_APP_KEY`
   - `PUSHER_SECRET`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`

5. **`lib/cloudinary.ts`** - Needs (optional):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

---

## ✅ What's Already Handled

- ✅ **Dynamic imports** - Map components use `dynamic` with `ssr: false`
- ✅ **Client components** - Properly marked with `'use client'`
- ✅ **API routes** - All use correct Next.js 15 syntax
- ✅ **TypeScript** - All type errors resolved
- ✅ **Database queries** - All use Supabase (no Prisma)
- ✅ **Authentication** - NextAuth + Supabase integration working

---

## 🎯 Quick Deploy Command

```bash
# Make sure everything is committed
git status

# If changes exist, commit them
git add .
git commit -m "Deploy to Vercel"
git push origin main

# Then deploy via Vercel dashboard or CLI
vercel --prod
```

---

## 📝 Environment Variables Template

Copy this to Vercel Environment Variables section:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=

# Optional: Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: Pusher
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_APP_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Optional: Discord Webhook
DISCORD_WEBHOOK_SECRET=
```

---

## 🚨 Critical Reminders

1. **NEXTAUTH_URL must match your Vercel domain**
2. **Discord OAuth redirect must include your Vercel domain**
3. **All NEXT_PUBLIC_ vars are exposed to the client**
4. **Never commit .env.local to git**
5. **Test in Vercel preview deployment first**

---

**Your app is ready for deployment!** Just follow the checklist above. 🎉
