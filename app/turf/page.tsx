'use client'

import dynamic from 'next/dynamic'

// Dynamically import TurfMap to avoid SSR issues with Leaflet
const TurfMap = dynamic(() => import('@/components/turf/TurfMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gang-secondary/80 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gang-highlight mx-auto mb-4"></div>
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
})

export default function TurfPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Territory Control
        </h1>
        <p className="text-gray-400 text-lg">
          Track and manage faction territories across Los Angeles
        </p>
      </div>

      <TurfMap />
    </div>
  )
}
