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

export default function MyLeavesPage() {
  const { data: session } = useSession()
  const { formatDateTime } = useTimezone()

  const { data, loading, error } = useApi<{ leaves: LeaveRow[] }>(`/api/leaves?scope=my`, {
    enabled: !!session,
    debounceMs: 300,
  })

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="elevated">
          <h1 className="text-3xl font-bold text-white mb-2">My Leaves</h1>
          <p className="text-gray-400">Sign in to view your leave history.</p>
        </Card>
      </div>
    )
  }

  const leaves = data?.leaves || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Leaves</h1>
            <p className="text-gray-400 mt-2">Your submitted leave requests.</p>
          </div>
          <Link
            href="/leaves/new"
            className="inline-flex items-center justify-center rounded-lg font-medium transition-all px-4 py-2 bg-gang-highlight hover:bg-gang-highlight/90 text-white whitespace-nowrap"
          >
            New Leave
          </Link>
        </div>
      </div>
      <Card variant="elevated">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="py-10 text-center text-orange-200">Failed to load leaves.</div>
        ) : leaves.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            No leaves yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left py-3 px-4">Note</TableHead>
                <TableHead className="text-left py-3 px-4 whitespace-nowrap">Dates</TableHead>
                <TableHead className="text-left py-3 px-4 whitespace-nowrap">Status</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
                <TableHead className="text-gray-300"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id} className="border-white/10">
                  <TableCell className="py-3 px-4 whitespace-nowrap text-white">
                    <div className="font-medium">{l.requested_for_name}</div>
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap text-gray-200">
                    {formatDateTime(l.start_date)} → {formatDateTime(l.end_date)}
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      l.status === 'AWAY' ? 'bg-orange-900 text-orange-200' :
                      l.status === 'RETURNED' ? 'bg-green-900 text-green-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap text-gray-300">
                    {l.created_at ? formatDateTime(l.created_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/leaves/${l.id}`}
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
