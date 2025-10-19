# 🚀 Complete Setup Guide - 83 Hoover Faction Hub

This guide will walk you through setting up the entire platform from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Discord Setup](#discord-setup)
3. [Database Setup](#database-setup)
4. [Third-Party Services](#third-party-services)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [First Run](#first-run)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

### Required Accounts
- Discord Developer Account
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Pusher account (free tier)
- Vercel account (for deployment, optional)

---

## Discord Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it "83 Hoover Hub" (or your faction name)
4. Click **Create**

### 2. Configure OAuth2

1. In your application, go to **OAuth2** → **General**
2. Add Redirect URLs:
   - Development: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://yourdomain.com/api/auth/callback/discord`
3. Copy your **Client ID** and **Client Secret** (save for later)

### 3. Create Bot (Optional, for advanced features)

1. Go to **Bot** section
2. Click **Add Bot**
3. Enable these intents:
   - Server Members Intent
   - Message Content Intent
4. Copy the **Bot Token** (save for later)

### 4. Get Guild ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server → Copy ID
3. This is your **Guild ID** (save for later)

### 5. Get Role IDs (Optional)

For role-based access control:
1. Right-click each role → Copy ID
2. Save these IDs:
   - Admin Role ID
   - Leader Role ID
   - Moderator Role ID

---

## Database Setup

### MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster:
   - Choose **FREE** tier (M0)
   - Select a region close to your users
   - Name it "83hoover-cluster"
4. Wait for cluster to deploy (2-3 minutes)

5. **Create Database User**:
   - Click **Database Access** → **Add New Database User**
   - Username: `hoover_admin`
   - Password: Generate a strong password (save it!)
   - Database User Privileges: **Read and write to any database**

6. **Whitelist IP Addresses**:
   - Click **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0)
   - Or add your specific IP for better security

7. **Get Connection String**:
   - Click **Database** → **Connect** → **Connect your application**
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with `83hoover`
   - Example: `mongodb+srv://hoover_admin:yourpassword@cluster.mongodb.net/83hoover?retryWrites=true&w=majority`

---

## Third-Party Services

### Cloudinary (Media Storage)

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to **Dashboard**
3. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

### Pusher (Real-time Updates)

1. Sign up at [Pusher](https://pusher.com/)
2. Create a new app:
   - Name: "83-hoover-realtime"
   - Cluster: Choose closest to your users
   - Tech stack: React (frontend) + Node.js (backend)
3. Go to **App Keys** tab
4. Copy these values:
   - app_id
   - key
   - secret
   - cluster

---

## Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd 83-hoover
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js, React, TypeScript
- Prisma, NextAuth
- TailwindCSS, Lucide Icons
- Pusher, Cloudinary, Leaflet
- And more...

---

## Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
# Windows
copy env.example .env

# Mac/Linux
cp env.example .env
```

### 2. Fill in Environment Variables

Open `.env` in your code editor and fill in all values:

```env
# Database - From MongoDB Atlas
DATABASE_URL="mongodb+srv://hoover_admin:yourpassword@cluster.mongodb.net/83hoover?retryWrites=true&w=majority"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Discord OAuth - From Discord Developer Portal
DISCORD_CLIENT_ID="your-client-id-here"
DISCORD_CLIENT_SECRET="your-client-secret-here"
DISCORD_BOT_TOKEN="your-bot-token-here"
DISCORD_GUILD_ID="your-guild-id-here"

# Discord Role IDs (Optional)
DISCORD_ADMIN_ROLE_ID="admin-role-id"
DISCORD_LEADER_ROLE_ID="leader-role-id"
DISCORD_MOD_ROLE_ID="moderator-role-id"

# Cloudinary - From Cloudinary Dashboard
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Pusher - From Pusher Dashboard
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# Discord Webhook (Optional)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
DISCORD_WEBHOOK_SECRET="generate-random-secret"

# App Config
NEXT_PUBLIC_FACTION_NAME="83 Hoover Criminals"
NEXT_PUBLIC_FACTION_COLOR="#e94560"
```

### 3. Generate NextAuth Secret

```bash
# Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Mac/Linux
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env` file.

---

## First Run

### 1. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

You should see: ✅ Database synchronized successfully

### 2. Start Development Server

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### 3. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the 83 Hoover homepage! 🎉

### 4. Test Discord Login

1. Click **"Sign In with Discord"**
2. Authorize the application
3. You should be redirected back and logged in
4. Your user will be created in the database

### 5. Verify Database

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This opens a GUI at `http://localhost:5555` where you can see your data.

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Check your `DATABASE_URL` is correct
- Ensure MongoDB Atlas IP whitelist includes your IP
- Verify database user credentials

### Issue: "Discord OAuth error"

**Solution:**
- Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Check redirect URL matches exactly: `http://localhost:3000/api/auth/callback/discord`
- Ensure you're a member of the Discord server

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Prisma Client not generated"

**Solution:**
```bash
npx prisma generate
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

### Issue: Real-time updates not working

**Solution:**
- Verify Pusher credentials in `.env`
- Check browser console for Pusher connection errors
- Ensure `NEXT_PUBLIC_` prefix is present for client-side variables

---

## Next Steps

### 1. Create Admin User

After first login, manually update your user role in the database:

```bash
npx prisma studio
```

1. Go to **User** table
2. Find your user
3. Change `role` to `ADMIN`
4. Save

### 2. Add Initial Content

- Create your first post
- Upload some media
- Set up turf zones (if using map feature)

### 3. Configure Discord Webhooks

Set up webhooks to automatically import Discord messages:

1. Create webhook in Discord channel
2. Use a service like [webhook.site](https://webhook.site) to forward to your API
3. Configure in database using Prisma Studio

### 4. Customize Branding

- Update colors in `tailwind.config.js`
- Replace logo in `components/layout/Navbar.tsx`
- Update metadata in `app/layout.js`

### 5. Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

---

## Support

If you encounter issues:

1. Check this guide thoroughly
2. Review error messages in terminal/browser console
3. Check [GitHub Issues](your-repo-url/issues)
4. Contact faction leadership on Discord

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema changes
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration (if using PostgreSQL)

# Deployment
vercel                   # Deploy to Vercel
vercel --prod            # Deploy to production
```

---

**You're all set! Welcome to the 83 Hoover Faction Hub! 🎮**
