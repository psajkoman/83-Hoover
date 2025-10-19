'use client'

import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (post: any) => void
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    type: 'GENERAL',
    title: '',
    content: '',
    tags: '',
    isIC: true,
  })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Upload media files first
      const mediaUrls: string[] = []
      for (const file of mediaFiles) {
        const formData = new FormData()
        formData.append('file', file)
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json()
          mediaUrls.push(url)
        }
      }

      // Create post
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          mediaUrls,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })

      if (response.ok) {
        const post = await response.json()
        onSuccess(post)
        setFormData({ type: 'GENERAL', title: '', content: '', tags: '', isIC: true })
        setMediaFiles([])
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Post" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Post Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
            required
          >
            <option value="GENERAL">General</option>
            <option value="ANNOUNCEMENT">Announcement</option>
            <option value="SCREENSHOT">Screenshot</option>
            <option value="WORD_ON_STREET">Word on Street</option>
            <option value="ATTACK_LOG">Attack Log</option>
            <option value="DEFENSE_LOG">Defense Log</option>
            <option value="GRAFFITI">Graffiti</option>
            <option value="MEDIA">Media</option>
          </select>
        </div>

        <Input
          label="Title (Optional)"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter a title..."
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Content
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight resize-none"
            rows={6}
            placeholder="What's happening?"
            required
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="hood, gang, turf"
        />

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isIC}
              onChange={(e) => setFormData({ ...formData, isIC: e.target.checked })}
              className="w-4 h-4 rounded border-gang-accent/30 bg-gang-primary/50 text-gang-highlight focus:ring-gang-highlight"
            />
            <span className="text-sm text-gray-300">In-Character (IC)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Media (Images/Videos)
          </label>
          <div className="border-2 border-dashed border-gang-accent/30 rounded-lg p-4 text-center hover:border-gang-highlight/50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              id="media-upload"
            />
            <label htmlFor="media-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, MP4 up to 10MB
              </p>
            </label>
          </div>
          
          {mediaFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {mediaFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gang-primary/30 rounded px-3 py-2">
                  <span className="text-sm text-gray-300 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setMediaFiles(mediaFiles.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Post
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
