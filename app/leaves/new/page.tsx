'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type DiscordMember = {
  id: string
  username: string
  display_name: string
  nickname?: string | null
  bot?: boolean
}

export default function CreateLeavePage() {
  const { data: session } = useSession()
  const router = useRouter()

  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)

  const [requestedForName, setRequestedForName] = useState('')
  const [requestedForDiscordId, setRequestedForDiscordId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [adminOverride, setAdminOverride] = useState(false)

  const [members, setMembers] = useState<DiscordMember[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      if (!session) return
      try {
        const res = await fetch('/api/discord/members')
        const data = await res.json()
        const list = Array.isArray(data?.members) ? data.members : []
        setMembers(list.filter((m: any) => !m.bot))
      } catch {
        setMembers([])
      }
    }

    fetchMembers()
  }, [session])

  const suggestions = useMemo(() => {
    const input = requestedForName.trim().toLowerCase()
    if (!input || input.length < 2) return []

    return members
      .filter((m) => {
        const serverName = (m.nickname || m.display_name || m.username || '').toLowerCase()
        const userName = (m.username || '').toLowerCase()
        return serverName.includes(input) || userName.includes(input)
      })
      .slice(0, 6)
  }, [members, requestedForName])

  const todayIso = useMemo(() => {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const isRetroactive = useMemo(() => {
    if (!startDate) return false
    return startDate < todayIso
  }, [startDate, todayIso])

  const onNameChange = (value: string) => {
    setRequestedForName(value)
    setRequestedForDiscordId(null)
    setShowDropdown(value.trim().length >= 2)
    setActiveSuggestionIndex(-1) // Reset active index when typing
  }

  const selectSuggestion = (m: DiscordMember) => {
    const display = m.nickname || m.display_name || m.username
    setRequestedForName(display)
    setRequestedForDiscordId(m.id)
    setShowDropdown(false)
    setActiveSuggestionIndex(-1)
  }

  const onSubmit = async () => {
    setError(null)

    if (!requestedForName.trim() || !startDate || !endDate) {
      setError('Please fill in Name, Start date, and End date.')
      return
    }

    if (endDate < startDate) {
      setError('End date cannot be before start date.')
      return
    }

    if (isRetroactive && !(adminOverride && isAdmin)) {
      setError('Retroactive leaves require admin override.')
      return
    }

    if (adminOverride && !isAdmin) {
      setError('Admin override requires admin role.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_for_name: requestedForName.trim(),
          requested_for_discord_id: requestedForDiscordId,
          start_date: startDate,
          end_date: endDate,
          note: note.trim() || null,
          admin_override: adminOverride,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to create leave.')
        return
      }

      const id = data?.leave?.id
      if (id) {
        router.push(`/leaves/${id}`)
      } else {
        router.push('/leaves/my')
      }
    } catch {
      setError('Failed to create leave.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="elevated">
          <h1 className="text-3xl font-bold text-white mb-2">Create Leave</h1>
          <p className="text-gray-400">Sign in to create a leave request.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create Leave</h1>
        <p className="text-gray-400 mt-2">Submit a new leave request.</p>
      </div>

      <Card variant="elevated">
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Name"
              value={requestedForName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={(e) => {
                if (!showDropdown) return
                
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : 0
                  )
                } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                  e.preventDefault()
                  selectSuggestion(suggestions[activeSuggestionIndex])
                } else if (e.key === 'Escape') {
                  setShowDropdown(false)
                }
              }}
              placeholder="Firstname Lastname"
            />

            {showDropdown && suggestions.length > 0 ? (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-gang-accent/30 bg-gang-secondary/95 backdrop-blur-md shadow-xl overflow-hidden">
                {suggestions.map((m, index) => {
                  const display = m.nickname || m.display_name || m.username
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(m)}
                      className={`w-full text-left px-3 py-2 hover:bg-white/5 text-white ${
                        activeSuggestionIndex === index ? 'bg-white/10' : ''
                      }`}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                    >
                      <div className="text-sm font-medium">{display}</div>
                      <div className="text-xs text-gray-400">@{m.username}</div>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {requestedForDiscordId ? (
              <p className="mt-1 text-xs text-gray-400">Discord-linked (overlap/inactive rules enforced).</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">Free text allowed. Select a suggestion to link to Discord.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight focus:border-transparent transition-all"
              placeholder="Optional details..."
            />
          </div>

          {isAdmin ? (
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={adminOverride}
                onChange={(e) => setAdminOverride(e.target.checked)}
              />
              Admin override
            </label>
          ) : null}

          {isRetroactive ? (
            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-200">
              This leave is retroactive. An admin override is required.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-200">
              {error}
            </div>
          ) : null}

          <div className="pt-6 mt-6 border-t border-gray-700 flex justify-end space-x-4">
            <Button onClick={onSubmit} isLoading={isSubmitting}>
              Submit Leave
            </Button>
            <Button variant="ghost" onClick={() => router.push('/leaves')}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
