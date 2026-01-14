'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useApi } from '@/hooks/useApi'
import { useTimezone } from '@/contexts/TimezoneContext'
import Card from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type LeaveRow = {
  id: string
  requested_for_name: string
  requested_for_discord_id: string | null
  start_date: string
  end_date: string
  note: string | null
  status: 'AWAY' | 'DENIED' | 'RETURNED'
  created_at: string | null
}

export default function PendingLeavesPage() {
  const { data: session } = useSession()
  const { formatDateTime } = useTimezone()
  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)
  
  // Format date without time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const { data, loading, error } = useApi<{ leaves: LeaveRow[] }>(`/api/leaves?scope=pending`, {
    enabled: !!session && !!isAdmin,
    debounceMs: 300,
  })

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="elevated">
          <h1 className="text-3xl font-bold text-white mb-2">Pending Leaves</h1>
          <p className="text-gray-400">Sign in to view pending leaves.</p>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="elevated">
          <h1 className="text-3xl font-bold text-white mb-2">Pending Leaves</h1>
          <p className="text-gray-400">You don’t have access to this page.</p>
        </Card>
      </div>
    )
  }

  const leaves = data?.leaves || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="container mx-auto p-4 pt-6 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Pending Leaves</h1>
          <p className="text-gray-400 mt-2">Review and manage pending leave requests.</p>
        </div>

        <Card variant="elevated" className="p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : error ? (
            <div className="py-10 text-center text-orange-200">Failed to load pending leaves.</div>
          ) : leaves.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No pending leaves.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left py-3 px-4">Name</TableHead>
                  <TableHead className="text-left py-3 px-4">Dates</TableHead>
                  <TableHead className="text-left py-3 px-4">Created</TableHead>
                  <TableHead className="text-right py-3 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-gray-800/50">
                    <TableCell className="py-3 px-4">
                      <div className="font-medium">{leave.requested_for_name}</div>
                      {leave.requested_for_discord_id && (
                        <div className="text-xs text-gray-400">Discord ID: {leave.requested_for_discord_id}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {leave.created_at ? formatDateTime(leave.created_at) : 'N/A'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Link
                        href={`/leaves/${leave.id}`}
                        className="inline-flex items-center justify-center rounded-lg font-medium transition-all px-3 py-1.5 text-sm bg-gang-highlight/10 hover:bg-gang-highlight/20 text-gang-highlight"
                      >
                        Review Request
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
