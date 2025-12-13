'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import { Users, Sword, Shield, Activity, MapPin } from 'lucide-react'
import DiscordMembersList from '@/components/admin/DiscordMembersList'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { formatRelativeTime } from '@/lib/utils'
import AnnouncementsSection from '@/components/feed/AnnouncementsSection'

const TurfMap = dynamic(() => import('@/components/turf/TurfMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex items-center justify-center bg-gang-secondary/80 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gang-highlight mx-auto mb-4"></div>
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
})

interface ActivityLog {
  type: 'war' | 'log' | 'member' | 'turf'
  action: 'created' | 'updated' | 'deleted'
  target: string
  timestamp: string
  actor?: string
}

interface FactionStats {
  memberCount: number
  activeWars: number
  controlledTurf: number
  activityLog: ActivityLog[]
}

interface MediaPreviewPost {
  id: string
  title: string | null
  created_at: string
  media_urls: string[] | null
  author?: {
    username?: string | null
  } | null
}

export default function HomePage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<FactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mediaPosts, setMediaPosts] = useState<MediaPreviewPost[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) {
        setLoading(false)
        return
      }

      try {
        // Fetch Discord members (excludes bots)
        const membersRes = await fetch('/api/discord/members')
        const membersData = await membersRes.json()
        const humanMembers = membersData.members?.filter((m: any) => !m.bot) || []

        // Fetch active wars count - use a dedicated endpoint
        const warsRes = await fetch('/api/wars?status=ACTIVE')
        const { wars } = await warsRes.json()
        console.log('wars', wars)

        setStats({
          memberCount: humanMembers.length,
          activeWars: wars?.length || 0,
          controlledTurf: 5, // Hardcoded for now - replace with API call
          activityLog: [
            {
              type: 'member',
              action: 'created',
              target: 'Davion Porter',
              timestamp: new Date().toISOString(),
              actor: 'System'
            },
            {
              type: 'member',
              action: 'created',
              target: 'Daquan Grady',
              timestamp: new Date().toISOString(),
              actor: 'System'
            },
            {
              type: 'member',
              action: 'created',
              target: '5 new members',
              timestamp: new Date().toISOString(),
              actor: 'System'
            }
          ]
        })
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [session])

  useEffect(() => {
    const fetchMediaPreview = async () => {
      setMediaLoading(true)
      try {
        const res = await fetch('/api/posts?limit=18')
        const data = await res.json()
        const posts = Array.isArray(data?.posts) ? data.posts : []

        const filtered = posts
          .filter((p: any) => Array.isArray(p?.media_urls) && p.media_urls.length > 0)
          .filter((p: any) => ['SCREENSHOT', 'MEDIA', 'GRAFFITI'].includes(p?.type))
          .slice(0, 6)
          .map((p: any) => ({
            id: p.id,
            title: p.title ?? null,
            created_at: p.created_at,
            media_urls: p.media_urls ?? null,
            author: p.author ?? null,
          }))

        setMediaPosts(filtered)
      } catch {
        setMediaPosts([])
      } finally {
        setMediaLoading(false)
      }
    }

    if (!session) {
      fetchMediaPreview()
    }
  }, [session])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Loading faction statistics...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            <span className="text-gang-highlight">Low West Crew</span> Faction Hub
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Sign in with Discord to view members, activity, wars, and manage turf.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/auth/signin"
              className="px-5 py-3 rounded-lg bg-gang-highlight hover:bg-gang-highlight/90 transition-colors text-white font-medium"
            >
              Sign In with Discord
            </Link>
            <Link
              href="/gallery"
              className="px-5 py-3 rounded-lg bg-gang-secondary hover:bg-white/10 transition-colors text-white font-medium"
            >
              View Gallery
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <Card variant="elevated">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Territory Preview</h2>
                <p className="text-gray-400">Sign in to see full turf details and controls.</p>
              </div>
              <Link
                href="/turf"
                className="shrink-0 px-4 py-2 rounded-lg bg-gang-secondary hover:bg-white/10 transition-colors text-white font-medium"
              >
                Open Turf Map
              </Link>
            </div>
            <TurfMap />
          </Card>
        </div>

        <Card variant="elevated">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Media Preview</h2>
              <p className="text-gray-400">A small glimpse of crew screenshots and clips.</p>
            </div>
            <Link
              href="/gallery"
              className="shrink-0 px-4 py-2 rounded-lg bg-gang-secondary hover:bg-white/10 transition-colors text-white font-medium"
            >
              Open Gallery
            </Link>
          </div>

          {mediaLoading ? (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 mt-4">Loading media...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaPosts.map((post) => (
                <div key={post.id} className="group">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800/40">
                    {post.media_urls?.[0] ? (
                      <Image
                        src={post.media_urls[0]}
                        alt={post.title || 'Media'}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-semibold truncate">
                          {post.title || 'Untitled'}
                        </p>
                        <p className="text-gray-300 text-xs">
                          {post.author?.username || 'Unknown'}
                          {' • '}
                          {formatRelativeTime(new Date(post.created_at))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {mediaPosts.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 text-center py-10">
                  <p className="text-gray-400">No media to preview yet.</p>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          <span className="text-gang-highlight">Low West Crew</span> Faction Hub
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Territory control, member activity, and war statistics
        </p>
      </div>

      <div className="mb-8">
        <AnnouncementsSection />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {/* Member Count */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Members</h3>
              <p className="text-2xl font-bold">
                {stats?.memberCount || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Active Wars */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <Sword className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Active Wars</h3>
              <p className="text-2xl font-bold">
                {stats?.activeWars || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Controlled Turf */}
        <Card variant="elevated">
          <div className="flex items-center gap-4 p-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <MapPin className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Turf</h3>
              <p className="text-2xl font-bold">
                {stats?.controlledTurf || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Log Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <Card variant="elevated">
            <h2 className="text-2xl font-bold text-white mb-4">Activity Log</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats?.activityLog?.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-800/30 rounded-lg transition-colors">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    log.type === 'war' ? 'bg-red-500' :
                    log.type === 'log' ? 'bg-blue-500' :
                    log.type === 'member' ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {log.actor || 'System'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {log.action} {log.type}: {log.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <Card variant="elevated">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/turf" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                🗺️ View Turf Map
              </Link>
              <Link href="/wars" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                ⚔️ Active Wars
              </Link>
              <Link href="/admin" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                👑 Member Management
              </Link>
              <Link href="/wars/" className="block px-4 py-3 rounded-lg bg-gang-secondary hover:bg-gang-highlight transition-colors text-white">
                View Wars History
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Member Preview */}
      <Card variant="elevated">
        <h2 className="text-2xl font-bold text-white mb-4">Faction Members</h2>
        <DiscordMembersList />
      </Card>
    </div>
  )
}