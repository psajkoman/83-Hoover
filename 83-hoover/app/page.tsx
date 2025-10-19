import Card from '@/components/ui/Card'
import { Users, TrendingUp, MapPin, Activity, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  // Check if Supabase is configured
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Setup Required Banner */}
        <Card className="bg-yellow-500/10 border-2 border-yellow-500/50 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-500 mb-2">
                ⚠️ Setup Required
              </h2>
              <p className="text-gray-300 mb-4">
                Your 83 Hoover Faction Hub is almost ready! You need to configure Supabase to get started.
              </p>
            </div>
          </div>
        </Card>

        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Welcome to <span className="text-gang-highlight">83 Hoover</span>
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Your faction hub is installed and ready to be configured!
          </p>
        </div>

        {/* Setup Steps */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">🚀 Quick Setup (15 minutes)</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gang-highlight flex items-center justify-center text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Create Supabase Project</h3>
                <p className="text-gray-400 mb-3">
                  Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-gang-highlight hover:underline">supabase.com</a> and create a free account.
                  Create a new project named "83-hoover-hub".
                </p>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gang-highlight hover:bg-gang-highlight/80 text-white rounded-lg transition-colors"
                >
                  Create Project <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gang-highlight flex items-center justify-center text-white font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Run Database Migration</h3>
                <p className="text-gray-400 mb-3">
                  In Supabase dashboard, go to <strong>SQL Editor</strong> → <strong>New query</strong>.
                  Copy the contents of <code className="bg-gang-secondary px-2 py-1 rounded">supabase/migrations/001_initial_schema.sql</code> and run it.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gang-highlight flex items-center justify-center text-white font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Get API Keys</h3>
                <p className="text-gray-400 mb-3">
                  In Supabase, go to <strong>Settings</strong> → <strong>API</strong>.
                  Copy your <strong>Project URL</strong> and <strong>anon public</strong> key.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gang-highlight flex items-center justify-center text-white font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Configure Environment Variables</h3>
                <p className="text-gray-400 mb-3">
                  Create a <code className="bg-gang-secondary px-2 py-1 rounded">.env.local</code> file in your project root:
                </p>
                <pre className="bg-gang-secondary p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_GUILD_ID="your-guild-id"`}
                </pre>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gang-highlight flex items-center justify-center text-white font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Restart the Server</h3>
                <p className="text-gray-400 mb-3">
                  Stop the dev server (Ctrl+C) and run <code className="bg-gang-secondary px-2 py-1 rounded">npm run dev</code> again.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Documentation Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:scale-105 transition-transform">
            <h3 className="font-bold text-white mb-2">📖 Quick Start</h3>
            <p className="text-sm text-gray-400 mb-3">10-minute setup guide</p>
            <Link href="/QUICKSTART.md" className="text-gang-highlight hover:underline text-sm">
              Read Guide →
            </Link>
          </Card>

          <Card className="hover:scale-105 transition-transform">
            <h3 className="font-bold text-white mb-2">🗄️ Supabase Setup</h3>
            <p className="text-sm text-gray-400 mb-3">Detailed configuration</p>
            <Link href="/SUPABASE_SETUP.md" className="text-gang-highlight hover:underline text-sm">
              Read Guide →
            </Link>
          </Card>

          <Card className="hover:scale-105 transition-transform">
            <h3 className="font-bold text-white mb-2">📚 Full Docs</h3>
            <p className="text-sm text-gray-400 mb-3">Complete documentation</p>
            <Link href="/README.md" className="text-gang-highlight hover:underline text-sm">
              Read Guide →
            </Link>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-gang-accent/20 border-gang-accent/50">
          <h3 className="font-bold text-white mb-2">💡 Need Help?</h3>
          <p className="text-gray-400 text-sm">
            Check the documentation files in your project root, or open an issue on GitHub.
            All setup guides are included in your project!
          </p>
        </Card>
      </div>
    )
  }

  // Supabase is configured - show the actual homepage
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Banner */}
      <Card className="bg-green-500/10 border-2 border-green-500/50 mb-8">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h2 className="text-lg font-bold text-green-500">
              ✅ Supabase Connected!
            </h2>
            <p className="text-gray-300 text-sm">
              Your faction hub is now fully operational. Sign in with Discord to get started.
            </p>
          </div>
        </div>
      </Card>

      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Welcome to <span className="text-gang-highlight">83 Hoover</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Official faction hub for the 83 Hoover Criminals. Stay connected with your crew,
          track territory, and share your RP moments.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center hover:scale-105 transition-transform">
          <Users className="w-8 h-8 text-gang-highlight mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-sm text-gray-400">Members</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-sm text-gray-400">Posts</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <MapPin className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-sm text-gray-400">Controlled Turf</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-sm text-gray-400">Active Today</div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                Welcome to your 83 Hoover Faction Hub! Here's what you can do next:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Sign in with Discord to create your first admin account</li>
                <li>Go to Supabase dashboard and change your role to 'ADMIN'</li>
                <li>Start creating posts and managing your faction</li>
                <li>Configure Discord webhooks for automatic post imports</li>
                <li>Invite your faction members to join</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href="/turf"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                🗺️ View Turf Map
              </Link>
              <Link
                href="/gallery"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                📸 Media Gallery
              </Link>
              <Link
                href="/admin"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                ⚙️ Admin Panel
              </Link>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="bg-gang-highlight/10 border-gang-highlight/30">
            <h3 className="font-bold text-lg text-gang-highlight mb-2">📋 Next Steps</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Sign in with Discord</li>
              <li>• Set yourself as admin</li>
              <li>• Create your first post</li>
              <li>• Configure webhooks</li>
              <li>• Invite members</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
