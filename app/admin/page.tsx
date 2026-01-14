// Core Next.js and React imports
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Type definitions
import { Database } from '@/types/supabase'

// Date utilities
import { format, formatDistanceToNow } from 'date-fns'

// Authentication
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Discord utilities
import { getGuildMembers } from '@/lib/discord'

// UI Components
import Card from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Icons
import { Users as UsersIcon, FileText, MapPin, Settings, UserPlus, LogOut } from 'lucide-react'

// Admin components
import DiscordMembersList from '@/components/admin/DiscordMembersList'
import WarManagement from '@/components/admin/WarManagement'
import { RecentVisits } from '@/components/admin/RecentVisits'

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
type Leave = Omit<Database['public']['Tables']['leaves']['Row'], 'status'> & {
  status: 'AWAY' | 'DENIED' | 'RETURNED'
}

// Type definitions


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

  // Check if user has admin role
  if (!user || !['ADMIN', 'LEADER', 'MODERATOR'].includes(user.role || '')) {
    redirect('/')
  }

  // Fetch current Discord members
  let currentMemberIds: Set<string> = new Set();
  try {
    const members = await getGuildMembers();
    members.forEach((member: any) => {
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
    allUsersResult,
    { data: pendingLeaves }
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
      .order('username', { ascending: true }),
    // Fetch pending leaves
    supabase
      .from('leaves')
      .select('*')
      .eq('status', 'AWAY')
      .order('created_at', { ascending: false })
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

  // First, get the login history
  const { data: loginHistoryData, error: loginHistoryError } = await supabase
    .from('login_history')
    .select('*')
    .order('login_time', { ascending: false })
    .limit(50); // Get more records to ensure we have enough after processing

  if (loginHistoryError) {
    console.error('Error fetching login history:', loginHistoryError);
  }

  // Get unique user IDs from login history
  const userIds = [...new Set(loginHistoryData?.map(login => login.discord_id) || [])];

  // Fetch user data for these IDs
  const { data: usersData } = await supabase
    .from('users')
    .select('discord_id, username, discriminator, avatar')
    .in('discord_id', userIds);

  // Create a map of user data by discord_id
  const usersMap = new Map(usersData?.map(user => [user.discord_id, user]) || []);

  // Process login history with user data
  const processedLoginHistory = (loginHistoryData || []).map(login => {
    const user = usersMap.get(login.discord_id);
    // Use username from login_history first, fall back to users table, then 'Unknown User'
    const displayName = login.username || user?.username || 'Unknown User';
    const discriminator = user?.discriminator || '0';
    const avatarUrl = user?.avatar 
      ? `https://cdn.discordapp.com/avatars/${login.discord_id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(discriminator) % 5)}.png`;

    return {
      discord_id: login.discord_id,
      login_time: login.login_time,
      last_visited_url: login.last_visited_url,
      displayName,
      avatarUrl,
      discriminator,
      // Format the time for display
      formattedTime: formatDistanceToNow(new Date(login.login_time), { addSuffix: true }),
      // Store the full date for tooltips
      fullDate: new Date(login.login_time)
    };
  });

  // Type for the processed login history
  type ProcessedLoginHistory = typeof processedLoginHistory[0];

  if (loginHistoryError) {
    console.error('Error fetching login history:', loginHistoryError);
  }

  // Group by user and get the most recent login for each
  const uniqueUserLogins = new Map<string, ProcessedLoginHistory>();
  processedLoginHistory.forEach(login => {
    if (!uniqueUserLogins.has(login.discord_id)) {
      uniqueUserLogins.set(login.discord_id, login);
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

      {/* Leave Approvals Section */}
      <Card variant="elevated" className="mb-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">Leave Approvals</h2>
              <p className="text-gray-400 text-sm mt-1">Review and manage pending leave requests.</p>
            </div>
            {pendingLeaves && pendingLeaves.length > 0 && (
              <Link
                href="/leaves/pending"
                className="text-sm font-medium text-gang-accent hover:text-gang-accent/80 transition-colors"
              >
                View All Pending
              </Link>
            )}
          </div>
        </div>
        
        {pendingLeaves?.length === 0 ? (
          <div className="py-6 text-center text-gray-400">No pending leave requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left py-3 px-4">Member</TableHead>
                  <TableHead className="text-left py-3 px-4">Dates</TableHead>
                  <TableHead className="text-left py-3 px-4">Status</TableHead>
                  <TableHead className="text-left py-3 px-4">Created</TableHead>
                  <TableHead className="text-right py-3 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLeaves?.slice(0, 5).map((leave) => (
                  <TableRow key={leave.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-white">{leave.requested_for_name}</div>
                      {leave.requested_for_discord_id && (
                        <div className="text-xs text-gray-400">Discord-linked</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {format(new Date(leave.start_date), 'd MMM yyyy')} → {format(new Date(leave.end_date), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900 text-orange-200">
                        Away
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-gray-300">
                      {leave.created_at ? format(new Date(leave.created_at), 'd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Link
                        href={`/leaves/${leave.id}`}
                        className="text-sm font-medium text-gang-accent hover:text-gang-accent/80 transition-colors"
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pendingLeaves && pendingLeaves.length > 5 && (
              <div className="px-4 py-3 text-center border-t border-white/10">
                <Link
                  href="/leaves/pending"
                  className="text-sm font-medium text-gang-accent hover:text-gang-accent/80 transition-colors"
                >
                  View all {pendingLeaves.length} pending requests
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <UsersIcon className="w-8 h-8 mx-auto mb-2 text-gang-highlight" />
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-white">Recent Visits</h3>
            <span className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300">
              {loginHistory.length} {loginHistory.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <RecentVisits loginHistory={loginHistory} />
          {loginHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                <UsersIcon className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No recent visits found</p>
              <p className="text-sm text-gray-500 mt-1">User activity will appear here</p>
            </div>
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
