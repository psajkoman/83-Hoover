'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatRelativeTime } from '@/lib/utils'

type AnnouncementPost = {
  id: string
  type: 'ANNOUNCEMENT'
  title: string | null
  content: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    username: string
    avatar?: string | null
    role?: string | null
  } | null
}

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<AnnouncementPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const canManage = useMemo(() => {
    return role ? ['ADMIN', 'LEADER', 'MODERATOR'].includes(role) : false
  }, [role])

  const fetchRole = async () => {
    try {
      const res = await fetch('/api/user/role')
      const data = await res.json()
      if (res.ok) {
        setRole(data?.role || 'MEMBER')
      }
    } catch {
      setRole('MEMBER')
    }
  }

  const fetchAnnouncements = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/posts?type=ANNOUNCEMENT&limit=10')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch announcements')
      }
      setAnnouncements(Array.isArray(data?.posts) ? data.posts : [])
    } catch (e) {
      setAnnouncements([])
      setError(e instanceof Error ? e.message : 'Failed to fetch announcements')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRole()
    fetchAnnouncements()
  }, [])

  const openCreate = () => {
    setDraftTitle('')
    setDraftContent('')
    setIsCreateOpen(true)
  }

  const openEdit = (post: AnnouncementPost) => {
    setEditId(post.id)
    setDraftTitle(post.title || '')
    setDraftContent(post.content || '')
    setIsEditOpen(true)
  }

  const submitCreate = async () => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ANNOUNCEMENT',
          title: draftTitle.trim() || null,
          content: draftContent,
          mediaUrls: [],
          tags: [],
          isIC: false,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create announcement')
      }

      setIsCreateOpen(false)
      await fetchAnnouncements()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create announcement')
    }
  }

  const submitEdit = async () => {
    if (!editId) return

    try {
      const res = await fetch(`/api/posts/${editId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: draftTitle.trim() || null,
          content: draftContent,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update announcement')
      }

      setIsEditOpen(false)
      setEditId(null)
      await fetchAnnouncements()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update announcement')
    }
  }

  const submitDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete announcement')
      }

      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete announcement')
    }
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3 mb-4 px-3 sm:px-4">
        <div className="mb-2 xs:mb-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Announcements</h2>
          <p className="text-sm sm:text-base text-gray-400">Important updates from leadership.</p>
        </div>

        {canManage ? (
          <Button size="sm" onClick={openCreate} className="w-full xs:w-auto">
            New Announcement
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-center py-8 px-2">
          <div className="inline-block w-8 h-8 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm sm:text-base text-gray-400 mt-4">Loading announcements...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-orange-400 mb-4">{error}</p>
          <Button variant="ghost" onClick={fetchAnnouncements}>
            Try Again
          </Button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3 px-1 sm:px-0">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-gang-accent/30 bg-gang-primary/30 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                    <h3 className="text-white font-semibold truncate text-sm sm:text-base">
                      {a.title || 'Announcement'}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(a.created_at)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap mt-2">{a.content}</p>
                </div>

                {canManage ? (
                  <div className="flex items-center gap-2 justify-end sm:justify-start mt-2 sm:mt-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="px-2 sm:px-3 text-xs sm:text-sm">
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => submitDelete(a.id)} className="px-2 sm:px-3 text-xs sm:text-sm">
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Announcement"
        size="lg"
      >
        <div className="space-y-4 px-1 sm:px-0">
          <Input
            label="Title (optional)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title..."
            className="text-sm sm:text-base"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight resize-none"
              rows={5}
              placeholder="Write the announcement..."
            />
          </div>
          <div className="flex flex-col xs:flex-row gap-2 pt-2">
            <Button 
              onClick={submitCreate} 
              disabled={!draftContent.trim()} 
              className="flex-1 px-2 sm:px-4 py-1.5 text-sm sm:text-base"
            >
              Publish
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)}
              className="px-2 sm:px-4 py-1.5 text-sm sm:text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditId(null)
        }}
        title="Edit Announcement"
        size="lg"
      >
        <div className="space-y-4 px-1 sm:px-0">
          <Input
            label="Title (optional)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title..."
            className="text-sm sm:text-base"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight resize-none"
              rows={5}
              placeholder="Update the announcement..."
            />
          </div>
          <div className="flex flex-col xs:flex-row gap-2 pt-2">
            <Button 
              onClick={submitEdit} 
              disabled={!draftContent.trim()} 
              className="flex-1 px-2 sm:px-4 py-1.5 text-sm sm:text-base"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditOpen(false)
                setEditId(null)
              }}
              className="px-2 sm:px-4 py-1.5 text-sm sm:text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
