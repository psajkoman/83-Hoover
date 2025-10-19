import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/types/supabase'
import Card from '@/components/ui/Card'
import { Users, FileText, MapPin, Settings } from 'lucide-react'

export default async function AdminPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', session.user.id)
    .single()

  if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role)) {
    redirect('/')
  }

  // Fetch admin stats
  const [usersResult, postsResult, pendingResult, recentUsersResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_pinned', false),
    supabase
      .from('users')
      .select('id, username, role, joined_at')
      .order('joined_at', { ascending: false })
      .limit(10),
  ])

  const totalUsers = usersResult.count || 0
  const totalPosts = postsResult.count || 0
  const pendingPosts = pendingResult.count || 0
  const recentUsers = recentUsersResult.data || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 text-lg">
          Manage faction content and members
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-gang-highlight" />
          <div className="text-3xl font-bold text-white mb-1">{totalUsers}</div>
          <div className="text-sm text-gray-400">Total Members</div>
        </Card>
        
        <Card className="text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <div className="text-3xl font-bold text-white mb-1">{totalPosts}</div>
          <div className="text-sm text-gray-400">Total Posts</div>
        </Card>
        
        <Card className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gang-green" />
          <div className="text-3xl font-bold text-white mb-1">{pendingPosts}</div>
          <div className="text-sm text-gray-400">Pending Review</div>
        </Card>
        
        <Card className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-2 text-gang-gold" />
          <div className="text-3xl font-bold text-white mb-1">Active</div>
          <div className="text-sm text-gray-400">System Status</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Members */}
        <Card variant="elevated">
          <h3 className="font-bold text-xl text-white mb-4">Recent Members</h3>
          <div className="space-y-3">
            {recentUsers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gang-primary/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">{member.username}</div>
                  <div className="text-xs text-gray-400">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold ${
                  member.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                  member.role === 'LEADER' ? 'bg-gang-gold/20 text-gang-gold' :
                  member.role === 'MODERATOR' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card variant="elevated">
          <h3 className="font-bold text-xl text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-gang-highlight hover:bg-gang-highlight/90 rounded-lg text-white font-medium transition-colors text-left">
              📢 Create Announcement
            </button>
            <button className="w-full px-4 py-3 bg-gang-accent hover:bg-gang-accent/90 rounded-lg text-white font-medium transition-colors text-left">
              🗺️ Update Turf Status
            </button>
            <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-left">
              👥 Manage Members
            </button>
            <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors text-left">
              ⚙️ Configure Webhooks
            </button>
          </div>
        </Card>
      </div>

      {/* Admin Notes */}
      <Card variant="bordered" className="mt-8 bg-gang-highlight/10 border-gang-highlight/30">
        <h3 className="font-bold text-lg text-gang-highlight mb-2">⚠️ Admin Notes</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• All actions are logged and monitored</li>
          <li>• Use moderation powers responsibly</li>
          <li>• Report any issues to faction leadership</li>
          <li>• Keep Discord roles synced with platform roles</li>
        </ul>
      </Card>
    </div>
  )
}
