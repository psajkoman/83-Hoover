'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Plus } from 'lucide-react'
import { MediaViewer } from './MediaViewer'

interface User {
  id: string
  username: string | null
  display_name: string | null
}

interface MediaItem {
  id: string
  url: string
  media_type: 'IMAGE' | 'VIDEO'
  title?: string | null
  description?: string | null
  created_at?: string
  user?: User | null
}

interface MediaDisplayProps {
  mediaItems: MediaItem[]
  className?: string
  onAddMedia?: () => void
}

const getVideoThumbnail = (videoUrl: string) => {
  try {
    const url = new URL(videoUrl)
    const thumbParam = url.searchParams.get('thumb') || url.searchParams.get('thumbnail')
    if (thumbParam) return thumbParam
    
    // Handle YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
    }
    
    // Handle Streamable
    if (videoUrl.includes('streamable.com/')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0]
      return videoId ? `https://cdn-cf-east.streamable.com/image/${videoId}.jpg` : ''
    }
  } catch (e) {
    console.error('Error generating thumbnail URL:', e)
  }
  return ''
}

export function MediaDisplay({ mediaItems, className = '', onAddMedia }: MediaDisplayProps) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const openMedia = (url: string, index: number) => {
    setSelectedMedia(url)
    setSelectedIndex(index)
  }

  const renderMedia = (media: MediaDisplayProps['mediaItems'][number]) => {
    const isImage = media.media_type === 'IMAGE' || 
                  media.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || 
                  media.url.includes('imgur.com') ||
                  media.url.includes('discord.com/attachments') ||
                  media.url.includes('cdn.discordapp.com/attachments')

    if (isImage) {
      return (
        <Image
          src={media.url}
          alt={media.title || 'Media'}
          fill
          className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => openMedia(media.url, mediaItems.indexOf(media))}
          unoptimized
        />
      )
    }

    // Handle videos
    const thumbnail = getVideoThumbnail(media.url)
    return (
      <div className="relative w-full h-full group">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={media.title || 'Video thumbnail'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gray-700" />
        )}
        <button
          onClick={() => openMedia(media.url, mediaItems.indexOf(media))}
          className="absolute inset-0 m-auto w-16 h-16 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
          aria-label="Play video"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Media Gallery</h1>
          <p className="text-gray-400 text-lg">
            {mediaItems.length} {mediaItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {onAddMedia && (
          <button
            onClick={onAddMedia}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Media</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaItems.map((media) => (
          <div 
            key={media.id} 
            className="bg-gray-800/80 rounded-lg overflow-hidden transition-all duration-200 border border-gray-700/50 hover:border-blue-500/60 flex flex-col w-full h-full"
          >
            <div className="relative w-full h-48 bg-gray-900/50">
              {renderMedia(media)}
              {media.media_type === 'VIDEO' && media.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <h3 className="text-white font-medium text-sm line-clamp-2" title={media.title}>
                    {media.title}
                  </h3>
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              {media.media_type === 'IMAGE' && media.title && (
                <h3 className="font-medium text-white mb-2 line-clamp-2" title={media.title}>
                  {media.title}
                </h3>
              )}
              <div className="mt-auto text-sm text-gray-400 flex items-center justify-between">
                <span className="truncate max-w-[50%]" title={media.user?.display_name || media.user?.username || 'Unknown'}>
                  {media.user?.display_name || media.user?.username || 'Unknown'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-gray-700/50 rounded-full">
                    {media.media_type === 'VIDEO' ? 'Video' : 'Image'}
                  </span>
                  <span className="text-xs opacity-75">
                    {media.created_at ? new Date(media.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <MediaViewer
        src={mediaItems.map(item => item.url)}
        open={selectedMedia !== null}
        onClose={() => setSelectedMedia(null)}
        initialIndex={selectedIndex}
      />
    </div>
  )
}
