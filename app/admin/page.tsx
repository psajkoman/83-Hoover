import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/types/supabase'
import Image from 'next/image'
import { format, formatDistanceToNow } from 'date-fns'
import { getGuildMembers } from '@/lib/discord'

// Helper function to get text color based on background color
const getTextColor = (bgColor: string): string => {
  if (!bgColor) return '#ffffff';
  
  // Convert hex to RGB
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);
  
  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

type User = Database['public']['Tables']['users']['Row']
type LoginHistory = Database['public']['Tables']['login_history']['Row']
import Card from '@/components/ui/Card'
import { Users, FileText, MapPin, Settings, UserPlus, LogOut } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DiscordMembersList from '@/components/admin/DiscordMembersList'
import WarManagement from '@/components/admin/WarManagement'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', (session.user as any).discordId)
    .single() as { data: User | null }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'LEADER' && user.role !== 'MODERATOR')) {
    redirect('/')
  }

  // Fetch current Discord members
  let currentMemberIds: Set<string> = new Set();
  try {
    const members = await getGuildMembers();
    members.forEach(member => {
      if (member.user?.id) {
        currentMemberIds.add(member.user.id);
      }
    });
  } catch (error) {
    console.error('Error fetching Discord members:', error);
  }

  const [
    usersResult, 
    postsResult, 
    pendingResult, 
    recentUsersResult,
    allUsersResult
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_pinned', false),
    supabase
      .from('users')
      .select('id, username, role, joined_at, discord_id')
      .order('joined_at', { ascending: false })
      .limit(10),
    supabase
      .from('users')
      .select('id, username, discord_id, role, joined_at, last_active, avatar, display_name')
      .order('username', { ascending: true })
  ])

  const totalUsers = usersResult.count || 0
  const totalPosts = postsResult.count || 0
  const pendingPosts = pendingResult.count || 0
  const recentUsers = recentUsersResult.data || []
  const allUsers = (allUsersResult.data || []).map(user => ({
    ...user,
    isInDiscord: currentMemberIds.has(user.discord_id)
  })).sort((a, b) => {
    // Sort by whether they're in Discord (in Discord first), then by username
    if (a.isInDiscord === b.isInDiscord) {
      return (a.username || '').localeCompare(b.username || '');
    }
    return a.isInDiscord ? -1 : 1;
  })

  // Fetch the most recent login for each user with their last visited URL
  type LoginHistory = Database['public']['Tables']['login_history']['Row'] & {
    displayName: string;
  };

  // Get the most recent login for each user
  const { data: loginHistoryData, error: loginHistoryError } = await supabase
    .from('login_history')
    .select('*')
    .order('login_time', { ascending: false });

  if (loginHistoryError) {
    console.error('Error fetching login history:', loginHistoryError);
  }

  // Group by user and get the most recent login for each
  const uniqueUserLogins = new Map<string, LoginHistory>();
  loginHistoryData?.forEach(login => {
    if (!uniqueUserLogins.has(login.discord_id)) {
      uniqueUserLogins.set(login.discord_id, {
        ...login,
        displayName: login.username || 'Unknown User'
      });
    }
  });

  // Convert to array and sort by most recent login
  const loginHistory = Array.from(uniqueUserLogins.values())
    .sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime())
    .slice(0, 10); // Get top 10 most recent logins

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
          <div className="text-sm text-gray-400">All Time Members</div>
        </Card>
        
        <Card className="text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Discord Server Members */}
        <DiscordMembersList />

        {/* War Management */}
        <WarManagement />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <button className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors text-left">
              👥 Manage Members
            </button>
            <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors text-left">
              ⚙️ Configure Webhooks
            </button>
          </div>
        </Card>
        
        {/* Login History */}
        <Card variant="elevated" className="h-full">
          <h3 className="font-bold text-xl text-white mb-4">Recent Visits</h3>
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Site Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.map((login) => (
                <TableRow key={`${login.discord_id}-${login.login_time}`}>
                  <TableCell className="font-medium">
                    {login.displayName}
                  </TableCell>
                  <TableCell>
                    {new Date(login.login_time).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {login.last_visited_url || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loginHistory.length === 0 && (
            <p className="text-gray-400 text-center py-4">No visit history found</p>
          )}
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
