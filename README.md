# 83 Hoover Criminals - Faction Hub 🎮

A modern, immersive web platform for the **83 Hoover Criminals** faction in a GTA San Andreas RP server. This platform centralizes communication, territory management, and faction updates outside Discord while keeping members engaged daily.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)

## 🌟 Features

### Core Features
- **Dynamic News Feed** - Aggregates posts from Discord (screenshots, announcements, attack/defense logs)
- **Discord OAuth2 Login** - Seamless authentication with role-based access control
- **Turf Map Visualization** - Interactive map showing controlled zones, conflicts, and territory history
- **Media Gallery** - Roleplay screenshots and "graffiti wall" for IC posts
- **Real-time Updates** - Live feed updates using Pusher WebSockets
- **Admin Dashboard** - Content moderation and faction management tools

### Technical Stack
- **Frontend**: Next.js 15.5 (App Router), React 19, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Discord OAuth2
- **Real-time**: Pusher WebSockets (or Supabase Realtime)
- **Media Storage**: Cloudinary
- **Maps**: React Leaflet
- **Deployment**: Vercel-ready

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Supabase account (free tier available)
- Discord Application (for OAuth)
- Cloudinary account (for media uploads)
- Pusher account (for real-time features, optional if using Supabase Realtime)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd 83-hoover
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `env.example` to `.env.local` and fill in your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Discord OAuth
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
```

4. **Set up Supabase database**

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

Quick setup:
- Create a Supabase project
- Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
- Configure Discord OAuth in Supabase dashboard

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

6. **Sign in and create admin user**
- Click "Sign In with Discord"
- After first login, go to Supabase dashboard → Table Editor → users
- Change your role to 'ADMIN'

## 📁 Project Structure

```
83-hoover/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── posts/          # Post CRUD operations
│   │   ├── comments/       # Comment operations
│   │   ├── turf/           # Turf management
│   │   ├── upload/         # Media upload
│   │   └── webhook/        # Discord webhook handler
│   ├── admin/              # Admin dashboard
│   ├── auth/               # Authentication pages
│   ├── gallery/            # Media gallery
│   ├── turf/               # Turf map page
│   └── page.tsx            # Homepage
├── components/
│   ├── feed/               # Feed components
│   ├── turf/               # Turf map components
│   ├── layout/             # Layout components
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── prisma.ts           # Prisma client
│   ├── cloudinary.ts       # Cloudinary utilities
│   ├── pusher.ts           # Pusher configuration
│   └── utils.ts            # Helper functions
├── prisma/
│   └── schema.prisma       # Database schema
└── public/                 # Static assets
```

## 🔧 Configuration

### Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 → Add redirect URL: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret to `.env`
5. Enable required scopes: `identify`, `email`, `guilds`, `guilds.members.read`

### Discord Webhook Setup

To automatically import posts from Discord:

1. Create a webhook in your Discord channel
2. Set up a bot or service to forward messages to `/api/webhook/discord`
3. Configure webhook mappings in the database using the `WebhookConfig` model

### MongoDB Setup

**Option 1: MongoDB Atlas (Recommended)**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Add to `DATABASE_URL` in `.env`

**Option 2: Local MongoDB**
```bash
# Install MongoDB locally
# Update DATABASE_URL to: mongodb://localhost:27017/83hoover
```

## 🎨 Customization

### Branding
Update faction colors in `tailwind.config.js`:
```js
colors: {
  'gang-primary': '#1a1a2e',
  'gang-secondary': '#16213e',
  'gang-accent': '#0f3460',
  'gang-highlight': '#e94560',
  'gang-gold': '#ffd700',
}
```

### Faction Name
Update in `env.example`:
```env
NEXT_PUBLIC_FACTION_NAME="Your Faction Name"
NEXT_PUBLIC_FACTION_COLOR="#e94560"
```

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Environment Variables for Production
- Update `NEXTAUTH_URL` to your production domain
- Ensure all API keys are production-ready
- Add Discord OAuth redirect for production URL

## 📚 API Documentation

### Posts API
- `GET /api/posts` - Fetch posts with pagination
- `POST /api/posts` - Create new post (authenticated)
- `GET /api/posts/[id]` - Get single post
- `PATCH /api/posts/[id]` - Update post (owner/admin)
- `DELETE /api/posts/[id]` - Delete post (owner/admin)

### Turf API
- `GET /api/turf` - Get all turf zones
- `POST /api/turf` - Create turf zone (admin)
- `PATCH /api/turf` - Update turf status (admin)

### Upload API
- `POST /api/upload` - Upload media to Cloudinary

## 🔐 Security

- All API routes are protected with NextAuth session checks
- Role-based access control (ADMIN, LEADER, MODERATOR, MEMBER)
- Discord server membership verification
- Input validation with Zod
- CSRF protection via NextAuth
- Secure file upload with type/size validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and intended for use by the 83 Hoover Criminals faction.

## 🆘 Support

For issues or questions:
- Open an issue on GitHub
- Contact faction leadership on Discord
- Check the documentation in `/docs`

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Voice chat integration
- [ ] Event calendar with reminders
- [ ] Achievement/reputation system
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark/light theme toggle

---

**Built with ❤️ for the 83 Hoover Criminals**
