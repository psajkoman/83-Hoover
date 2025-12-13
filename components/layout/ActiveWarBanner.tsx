'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { X, Swords } from 'lucide-react'

const SNOOZE_MS = 6 * 60 * 60 * 1000
const STORAGE_KEY = 'active_war_banner_snooze_until'

export default function ActiveWarBanner() {
  const { data: session } = useSession()
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [isHidden, setIsHidden] = useState(true)

  const snoozeUntil = useMemo(() => {
    if (typeof window === 'undefined') return 0
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setIsHidden(true)
      return
    }

    const now = Date.now()
    setIsHidden(now < snoozeUntil)
  }, [session, snoozeUntil])

  useEffect(() => {
    if (!session?.user) return

    let isCancelled = false

    const fetchActiveWars = async () => {
      try {
        const res = await fetch('/api/wars?status=ACTIVE', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const wars = Array.isArray(data?.wars) ? data.wars : []
        if (!isCancelled) setActiveCount(wars.length)
      } catch {
        // ignore
      }
    }

    fetchActiveWars()
    const interval = window.setInterval(fetchActiveWars, 2 * 60 * 1000)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [session])

  const shouldShow = session?.user && !isHidden && (activeCount ?? 0) > 0

  const handleDismiss = () => {
    const until = Date.now() + SNOOZE_MS
    window.localStorage.setItem(STORAGE_KEY, String(until))
    setIsHidden(true)
  }

  if (!shouldShow) return null

  return (
    <div className="sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-3 mb-2">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-gang-highlight/30 bg-gang-highlight/10 backdrop-blur-md px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Swords className="w-5 h-5 text-gang-highlight" />
              </div>
              <div className="text-sm text-white">
                <div className="font-semibold">Active faction war{activeCount === 1 ? '' : 's'} in progress</div>
                <div className="text-gray-200/90">
                  Stay alert and log encounters.{' '}
                  <Link href="/wars" className="underline underline-offset-2 hover:text-white">
                    View wars
                  </Link>
                  .
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Dismiss war notice for 6 hours"
              title="Hide for 6 hours"
            >
              <X className="w-4 h-4 text-gray-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
