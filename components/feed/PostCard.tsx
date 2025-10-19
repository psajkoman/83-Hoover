'use client'

import { useState } from 'react'
import { MessageCircle, Heart, Pin, Trash2, Edit } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { formatRelativeTime, getPostTypeColor, getPostTypeIcon } from '@/lib/utils'
import Image from 'next/image'

interface Post {
  id: string
  type: string
  title?: string
  content: string
  mediaUrls: string[]
  tags: string[]
  isIC: boolean
  isPinned: boolean
  createdAt: string
  author: {
    id: string
    username: string
    avatar?: string
    role: string
    rank?: string
  }
  comments: any[]
}

interface PostCardProps {
  post: Post
  onComment?: (postId: string) => void
  onDelete?: (postId: string) => void
  onEdit?: (postId: string) => void
  currentUserId?: string
}

export default function PostCard({ post, onComment, onDelete, onEdit, currentUserId }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(false)

  const canEdit = currentUserId === post.author.id
  const canDelete = canEdit || ['ADMIN', 'LEADER', 'MODERATOR'].includes(post.author.role)

  return (
    <Card variant="elevated" className="hover:shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gang-accent">
            {post.author.avatar ? (
              <Image
                src={`https://cdn.discordapp.com/avatars/${post.author.id}/${post.author.avatar}.png`}
                alt={post.author.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {post.author.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{post.author.username}</span>
              {post.author.rank && (
                <span className="text-xs px-2 py-0.5 bg-gang-gold/20 text-gang-gold rounded">
                  {post.author.rank}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{formatRelativeTime(post.createdAt)}</span>
              <span>•</span>
              <span className={`${getPostTypeColor(post.type)} px-2 py-0.5 rounded text-xs text-white`}>
                {getPostTypeIcon(post.type)} {post.type.replace('_', ' ')}
              </span>
              {post.isIC && (
                <>
                  <span>•</span>
                  <span className="text-gang-green text-xs">IC</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {post.isPinned && <Pin className="w-4 h-4 text-gang-gold" />}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(post.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Edit className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
      )}

      {/* Content */}
      <p className="text-gray-300 mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Media */}
      {post.mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {post.mediaUrls.map((url, index) => (
            <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gang-primary">
              <Image
                src={url}
                alt={`Media ${index + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gang-accent/30 text-gang-highlight rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-gang-accent/30">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            liked ? 'bg-gang-highlight/20 text-gang-highlight' : 'hover:bg-white/10 text-gray-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span className="text-sm">Like</span>
        </button>
        
        <button
          onClick={() => {
            setShowComments(!showComments)
            if (onComment) onComment(post.id)
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">{post.comments.length} Comments</span>
        </button>
      </div>

      {/* Comments Preview */}
      {showComments && post.comments.length > 0 && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gang-accent/30">
          {post.comments.slice(0, 3).map((comment: any) => (
            <div key={comment.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gang-accent flex items-center justify-center text-xs text-white font-bold">
                {comment.author.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="bg-gang-primary/50 rounded-lg p-2">
                  <span className="font-semibold text-sm text-white">{comment.author.username}</span>
                  <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
