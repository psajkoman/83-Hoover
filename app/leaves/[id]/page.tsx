'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTimezone } from '@/contexts/TimezoneContext'
import { useApi } from '@/hooks/useApi'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type LeaveRow = {
  id: string
  requested_for_name: string
  requested_for_discord_id: string | null
  start_date: string
  end_date: string
  note: string | null
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_DENIED'
  created_at: string | null
  created_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
}

export default function LeaveDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { data: session } = useSession()
  const { formatDateTime } = useTimezone()

  // Format date without time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)

  const { data, loading, error } = useApi<{ leave: LeaveRow }>(`/api/leaves/${id}`, {
    enabled: !!session && !!id,
    debounceMs: 300,
  })

  const leave = data?.leave

  const [decisionNote, setDecisionNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const canDecide = useMemo(() => {
    return !!isAdmin && leave?.status === 'PENDING'
  }, [isAdmin, leave?.status])

  const decide = async (action: 'APPROVE' | 'DENY') => {
    if (!id) return
    setActionError(null)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          decision_note: decisionNote.trim() || null,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        setActionError(payload?.error || 'Failed to update leave.')
        return
      }

      router.refresh()
    } catch {
      setActionError('Failed to update leave.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Card variant="elevated" className="p-8 text-center">
          <h3 className="text-lg font-medium text-white mb-2">Sign in to view leave details.</h3>
          <p className="text-gray-400">Please sign in to view leave details.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Leave Details</h1>
            <p className="text-gray-400 mt-1">View and manage this leave request.</p>
          </div>
          <Link 
            href="/leaves" 
            className="inline-flex items-center text-sm text-gray-300 hover:text-white transition-colors"
          >
            <span className="mr-1">←</span> Back to Leaves
          </Link>
        </div>
      </div>

      {loading ? (
        <Card variant="elevated" className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </Card>
      ) : error || !leave ? (
        <Card variant="elevated" className="p-8 text-center">
          <h3 className="text-lg font-medium text-white mb-2">Leave not found</h3>
          <p className="text-gray-400">The requested leave could not be found or you don't have permission to view it.</p>
        </Card>
      ) : (
        <Card variant="elevated" className="p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-400">Requested For</h3>
                <p className="text-white text-lg font-medium">{leave.requested_for_name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-400">Status</h3>
                <div className={`text-lg font-medium ${
                  leave.status === 'APPROVED' ? 'text-green-400' :
                  leave.status === 'DENIED' ? 'text-red-400' :
                  leave.status === 'AUTO_DENIED' ? 'text-orange-400' : 'text-yellow-400'
                }`}>
                  {leave.status.replace('_', ' ')}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-400">Start Date</h3>
                <p className="text-white text-lg">{formatDate(leave.start_date)}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-400">End Date</h3>
                <p className="text-white text-lg">{formatDate(leave.end_date)}</p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <h3 className="text-sm font-medium text-gray-400">Notes</h3>
                <div className="text-white bg-gray-900/50 p-4 rounded-lg">
                  {leave.note || <span className="text-gray-400">No notes provided.</span>}
                </div>
              </div>
            </div>

            {leave.decision_note && (
              <div className="pt-6 border-t border-gray-800 space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Decision Note</h3>
                <div className="text-white bg-gray-900/50 p-4 rounded-lg">
                  {leave.decision_note}
                </div>
              </div>
            )}

            {canDecide ? (
              <div className="pt-8 mt-6 border-t border-gray-800">
                <h3 className="text-lg font-medium text-white mb-4">Admin Actions</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Decision Notes</label>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gang-highlight focus:border-transparent transition-all"
                      placeholder="Optional reason / notes..."
                    />
                  </div>

                  {actionError && (
                    <div className="p-3 text-sm text-orange-200 bg-orange-500/10 border border-orange-500/40 rounded-lg">
                      {actionError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="danger"
                      onClick={() => decide('DENY')}
                      disabled={isSaving}
                      className="flex-1 justify-center py-2.5"
                    >
                      {isSaving ? 'Processing...' : 'Deny'}
                    </Button>
                    <Button
                      onClick={() => decide('APPROVE')}
                      disabled={isSaving}
                      className="flex-1 justify-center py-2.5"
                    >
                      {isSaving ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : !isAdmin && leave.status === 'PENDING' ? (
              <div className="p-4 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-lg">
                Awaiting admin review.
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}
