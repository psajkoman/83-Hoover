'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useTimezone } from '@/contexts/TimezoneContext'
import { useApi } from '@/hooks/useApi'
import Card from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type LeaveRow = {
  id: string
  requested_for_name: string
  requested_for_discord_id: string | null
  start_date: string
  end_date: string
  note: string | null
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_DENIED'
  created_at: string | null
}

export default function LeavesHomePage() {
  const { data: session } = useSession()
  const { formatDateTime } = useTimezone()
  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)
  
  // Format date without time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const { data, loading, error } = useApi<{ leaves: LeaveRow[] }>(`/api/leaves`, {
    enabled: !!session,
    debounceMs: 300,
  })

  const leaves = data?.leaves || []

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="elevated">
          <h1 className="text-3xl font-bold text-white mb-2">Leaves</h1>
          <p className="text-gray-400">Sign in to create and view leaves.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Leaves</h1>
        <p className="text-gray-400 mt-2">Create and track Leaves of Absence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="elevated" className="h-full">
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold text-white mb-2">Create Leave</h2>
            <p className="text-gray-400 text-sm mb-4">Submit a leave request for any member.</p>
            <div>
              <Link
                href="/leaves/new"
                className="inline-flex items-center justify-center rounded-lg font-medium transition-all px-4 py-2 bg-gang-highlight hover:bg-gang-highlight/90 text-white"
              >
                New Leave
              </Link>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="h-full">
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold text-white mb-2">My Leaves</h2>
            <p className="text-gray-400 text-sm mb-4">View your submitted leave history.</p>
            <div>
              <Link
                href="/leaves/my"
                className="inline-flex items-center justify-center rounded-lg font-medium transition-all px-4 py-2 bg-gang-accent hover:bg-gang-accent/90 text-white"
              >
                View History
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="elevated" className="mt-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">All Leaves</h2>
          <p className="text-gray-400 text-sm mt-1">View all leave requests submitted by members.</p>
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading leaves...</div>
        ) : error ? (
          <div className="py-10 text-center text-orange-200">Failed to load leaves.</div>
        ) : leaves.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No leaves found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left py-3 px-4">Member</TableHead>
                <TableHead className="text-left py-3 px-4 whitespace-nowrap">Dates</TableHead>
                <TableHead className="text-left py-3 px-4 whitespace-nowrap">Status</TableHead>
                <TableHead className="text-left py-3 px-4 whitespace-nowrap">Created</TableHead>
                <TableHead className="text-left py-3 px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id} className="border-white/10">
                  <TableCell className="py-3 px-4">
                    <div className="font-medium text-white">{leave.requested_for_name}</div>
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap text-gray-200">
                    {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      leave.status === 'APPROVED' ? 'bg-green-900 text-green-200' :
                      leave.status === 'DENIED' ? 'bg-red-900 text-red-200' :
                      leave.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-gray-800 text-gray-300'
                    }`}>
                      {leave.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap text-gray-300">
                    {leave.created_at ? formatDateTime(leave.created_at) : '—'}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Link
                      href={`/leaves/${leave.id}`}
                      className="text-sm text-gang-highlight hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
