'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Plus, Loader2, Link2, AlertCircle } from 'lucide-react'
import { addMediaAction } from '@/app/actions/addMedia'
import { MediaDisplay } from '@/components/media/MediaDisplay'

interface MediaItem {
  id: string
  title: string | null
  description: string | null
  url: string
  media_type: 'IMAGE' | 'VIDEO'
  created_at: string
  user_id: string
  user: { 
    id: string
    username: string | null
    display_name: string | null
  } | null
}

export default function MediaPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      setIsSessionLoading(false);
    }
  });
  const supabase = createClientComponentClient<Database>()
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch media with user join
  const fetchMedia = async () => {
    try {
      const { data: media, error } = await supabase
        .from('media')
        .select(`
          *,
          user:users!fk_media_user_id (id, username, display_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMediaItems(media || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load media')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      setIsSessionLoading(false);
      fetchMedia();
    } else {
      setIsSessionLoading(false);
    }
  }, [status]);

  const isImageUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const u = url.toLowerCase()
    return imageExtensions.some(ext => u.endsWith(ext)) ||
           u.includes('imgur.com') ||
           u.includes('discord.com/attachments') ||
           u.includes('cdn.discordapp.com/attachments')
  }

  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const u = url.toLowerCase()
    return videoExtensions.some(ext => u.endsWith(ext)) ||
           u.includes('youtube.com') || 
           u.includes('youtu.be') ||
           u.includes('streamable.com')
  }

  const validateUrl = (url: string) => {
    if (!url) return { isValid: false, error: 'URL is required' }
    try {
      new URL(url)
      if (!isImageUrl(url) && !isVideoUrl(url))
        return { isValid: false, error: 'Unsupported media URL' }
      return { isValid: true }
    } catch {
      return { isValid: false, error: 'Invalid URL' }
    }
  }

  const addMedia = async () => {
    if (isSessionLoading) {
      console.log('Session is still loading...');
      return;
    }
    
    if (status !== 'authenticated') {
    console.error('Authentication check failed. Status:', status);
    setError('You must be logged in to add media');
    return;
  }


    setError(null)
    const { isValid, error: vErr } = validateUrl(mediaUrl)
    if (!isValid) {
      setError(vErr || 'Invalid URL')
      return
    }

    setIsSubmitting(true)
    try {
      const mediaType = isVideoUrl(mediaUrl) ? 'VIDEO' : 'IMAGE'
      await addMediaAction({
        url: mediaUrl,
        title: title || undefined,
        description: description || undefined,
        media_type: mediaType,
      })

      await fetchMedia()
      setShowAddModal(false)
      setMediaUrl('')
      setTitle('')
      setDescription('')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to add media')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <MediaDisplay 
        mediaItems={mediaItems.map(m => ({
          ...m,
          title: m.title || undefined,
          description: m.description || undefined
        }))}
        onAddMedia={status === 'authenticated' ? () => setShowAddModal(true) : undefined}
      />

      {/* Add Media Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Media"
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-white">
              Media URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gang-secondary border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste image or video URL"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Supported: Imgur, YouTube, Streamable, Discord, direct image/video links
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-white">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gang-secondary border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-white">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gang-secondary border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={addMedia}
              disabled={isSubmitting || !mediaUrl}
            >
              {isSubmitting ? 'Uploading...' : 'Add Media'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
