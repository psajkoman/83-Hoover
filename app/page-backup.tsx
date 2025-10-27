import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import Feed from '@/components/feed/Feed'
import Card from '@/components/ui/Card'
import { Users, TrendingUp, MapPin, Activity } from 'lucide-react'
import Image from 'next/image'

export default async function HomePage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Fetch initial posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(id, username, avatar, role, rank),
      comments(
        *,
        author:users!comments_author_id_fkey(id, username, avatar)
      )
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch stats
  const [
    { count: totalMembers },
    { count: totalPosts },
    { count: controlledTurf }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('turf_zones').select('*', { count: 'exact', head: true }).eq('status', 'CONTROLLED'),
  ])

  const { data: recentActivity } = await supabase
    .from('users')
    .select('id, username, avatar')
    .gte('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(5)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="text-2xl font-bold text-white">{totalMembers || 0}</div>
          <div className="text-sm text-gray-400">Members</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{totalPosts || 0}</div>
          <div className="text-sm text-gray-400">Posts</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <MapPin className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{controlledTurf || 0}</div>
          <div className="text-sm text-gray-400">Controlled Turf</div>
        </Card>
        
        <Card className="text-center hover:scale-105 transition-transform">
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{recentActivity?.length || 0}</div>
          <div className="text-sm text-gray-400">Active Today</div>
        </Card>
      </div>

      {/* Main Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Feed initialPosts={posts || []} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gang-highlight" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((user: any) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gang-accent flex items-center justify-center">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.username}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-white">
                          {user.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <p className="text-xs text-gray-400">Active now</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No recent activity</p>
              )}
            </div>
          </Card>

          {/* Quick Links */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a
                href="/turf"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                View Turf Map
              </a>
              <a
                href="/gallery"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                Photo Gallery
              </a>
              <a
                href="/admin"
                className="block px-4 py-2 rounded-lg bg-gang-secondary hover:bg-gang-accent transition-colors text-white text-sm"
              >
                Admin Panel
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
