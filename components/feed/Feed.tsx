'use client'

import { useEffect, useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import PostCard from './PostCard'
import Button from '../ui/Button'
import CreatePostModal from './CreatePostModal'
import { pusherClient, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

interface FeedProps {
  initialPosts: any[]
  currentUserId?: string
}

export default function Feed({ initialPosts, currentUserId }: FeedProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Subscribe to real-time updates (if Pusher is configured)
    if (!pusherClient) return

    const channel = pusherClient.subscribe(PUSHER_CHANNELS.FEED)
    
    channel.bind(PUSHER_EVENTS.NEW_POST, (newPost: any) => {
      setPosts((prev) => [newPost, ...prev])
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [])

  const loadMore = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts?skip=${posts.length}&limit=20${filter ? `&type=${filter}` : ''}`)
      const data = await response.json()
      setPosts((prev) => [...prev, ...data.posts])
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleCreatePost = (newPost: any) => {
    setPosts((prev) => [newPost, ...prev])
    setIsCreateModalOpen(false)
  }

  const filteredPosts = filter
    ? posts.filter((post) => post.type === filter)
    : posts

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter || ''}
            onChange={(e) => setFilter(e.target.value || null)}
            className="bg-gang-secondary border border-gang-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
          >
            <option value="">All Posts</option>
            <option value="ANNOUNCEMENT">Announcements</option>
            <option value="SCREENSHOT">Screenshots</option>
            <option value="WORD_ON_STREET">Word on Street</option>
            <option value="ATTACK_LOG">Attack Logs</option>
            <option value="DEFENSE_LOG">Defense Logs</option>
            <option value="GRAFFITI">Graffiti</option>
            <option value="MEDIA">Media</option>
          </select>
        </div>
        
        {currentUserId && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Load More */}
      {filteredPosts.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            onClick={loadMore}
            isLoading={isLoading}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No posts yet. Be the first to post!</p>
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreatePost}
      />
    </div>
  )
}
