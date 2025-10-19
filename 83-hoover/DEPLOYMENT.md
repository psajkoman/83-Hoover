# 🚀 Deployment Guide

This guide covers deploying the 83 Hoover Faction Hub to production.

## Deployment Options

1. **Vercel** (Recommended) - Zero-config deployment
2. **Railway** - Easy deployment with database included
3. **DigitalOcean App Platform**
4. **Self-hosted** (VPS/Docker)

---

## Option 1: Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- All environment variables ready

### Steps

#### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/83-hoover.git
git push -u origin main
```

#### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### 3. Add Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables** and add all variables from your `.env` file:

**Critical Variables:**
```env
DATABASE_URL=mongodb+srv://...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_GUILD_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_PUSHER_APP_KEY=...
PUSHER_APP_ID=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_CLUSTER=...
```

**Important:** Make sure to add `NEXT_PUBLIC_` prefix for client-side variables!

#### 4. Update Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Add production redirect URL:
   ```
   https://your-domain.vercel.app/api/auth/callback/discord
   ```

#### 5. Deploy

Click **"Deploy"** in Vercel. Your site will be live in ~2 minutes!

### Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Discord OAuth redirect URL

---

## Option 2: Railway

### Steps

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Add environment variables
5. Railway will auto-detect Next.js and deploy

### Add MongoDB

1. Click **"New"** → **"Database"** → **"MongoDB"**
2. Copy the connection string
3. Update `DATABASE_URL` in environment variables

---

## Option 3: DigitalOcean App Platform

### Steps

1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Click **"Create"** → **"Apps"**
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm run build`
   - Run Command: `npm start`
5. Add environment variables
6. Deploy

---

## Option 4: Self-Hosted (Docker)

### Create Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Add all other env variables
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

volumes:
  mongodb_data:
```

### Deploy

```bash
docker-compose up -d
```

---

## Post-Deployment Checklist

### 1. Verify Deployment
- [ ] Site loads correctly
- [ ] Discord login works
- [ ] Database connection successful
- [ ] Media uploads work (Cloudinary)
- [ ] Real-time updates work (Pusher)

### 2. Security
- [ ] Environment variables are secure
- [ ] Database has proper access controls
- [ ] HTTPS is enabled
- [ ] CORS is configured correctly

### 3. Performance
- [ ] Images are optimized
- [ ] Caching is enabled
- [ ] CDN is configured (if using custom domain)

### 4. Monitoring
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure uptime monitoring
- [ ] Set up analytics (optional)

---

## Environment Variables Reference

### Required
```env
DATABASE_URL              # MongoDB connection string
NEXTAUTH_URL             # Your production URL
NEXTAUTH_SECRET          # Random secret (32+ chars)
DISCORD_CLIENT_ID        # Discord OAuth client ID
DISCORD_CLIENT_SECRET    # Discord OAuth secret
DISCORD_GUILD_ID         # Your Discord server ID
```

### Optional but Recommended
```env
DISCORD_BOT_TOKEN        # For advanced Discord features
DISCORD_ADMIN_ROLE_ID    # Admin role ID
DISCORD_LEADER_ROLE_ID   # Leader role ID
DISCORD_MOD_ROLE_ID      # Moderator role ID
```

### Media & Real-time
```env
CLOUDINARY_CLOUD_NAME    # Cloudinary cloud name
CLOUDINARY_API_KEY       # Cloudinary API key
CLOUDINARY_API_SECRET    # Cloudinary API secret
NEXT_PUBLIC_PUSHER_APP_KEY  # Pusher app key (public)
PUSHER_APP_ID            # Pusher app ID
PUSHER_SECRET            # Pusher secret
NEXT_PUBLIC_PUSHER_CLUSTER  # Pusher cluster
```

---

## Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
```bash
# Add to build command
npx prisma generate && npm run build
```

**Error: Module not found**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Runtime Errors

**Error: Database connection failed**
- Verify `DATABASE_URL` is correct
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for Vercel)
- Ensure database user has proper permissions

**Error: Discord OAuth not working**
- Verify redirect URL matches exactly
- Check `NEXTAUTH_URL` is set to production URL
- Ensure Discord app has correct scopes

**Error: Images not loading**
- Verify Cloudinary credentials
- Check CORS settings in Cloudinary
- Ensure file size limits are appropriate

### Performance Issues

**Slow page loads**
- Enable caching in Vercel/hosting platform
- Optimize images (use Next.js Image component)
- Consider adding a CDN

**Database slow**
- Upgrade MongoDB Atlas tier
- Add database indexes (check Prisma schema)
- Implement query optimization

---

## Scaling

### Horizontal Scaling
- Vercel automatically scales
- For self-hosted: use load balancer + multiple instances

### Database Scaling
- Upgrade MongoDB Atlas tier
- Enable read replicas
- Implement caching (Redis)

### CDN
- Vercel includes CDN
- For custom: use Cloudflare or AWS CloudFront

---

## Backup Strategy

### Database Backups
```bash
# MongoDB Atlas: Enable automated backups in dashboard
# Self-hosted: Use mongodump
mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)
```

### Media Backups
- Cloudinary has automatic backups
- Consider periodic exports for critical media

---

## Monitoring & Logging

### Recommended Tools
- **Sentry** - Error tracking
- **Vercel Analytics** - Performance monitoring
- **LogRocket** - Session replay
- **UptimeRobot** - Uptime monitoring

### Setup Sentry (Optional)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## Cost Estimates

### Free Tier (Suitable for small factions)
- Vercel: Free (100GB bandwidth/month)
- MongoDB Atlas: Free (512MB storage)
- Cloudinary: Free (25GB storage, 25GB bandwidth)
- Pusher: Free (200k messages/day)

**Total: $0/month** ✅

### Paid Tier (Growing factions)
- Vercel Pro: $20/month
- MongoDB Atlas M10: $57/month
- Cloudinary Plus: $89/month
- Pusher Channels: $49/month

**Total: ~$215/month**

---

## Support

For deployment issues:
- Check Vercel/Railway logs
- Review this guide
- Contact faction tech lead
- Open GitHub issue

---

**Happy Deploying! 🚀**
