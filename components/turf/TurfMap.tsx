'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { LatLngExpression } from 'leaflet'
import Card from '../ui/Card'
import { pusherClient, PUSHER_CHANNELS, PUSHER_EVENTS } from '@/lib/pusher'

// Dynamically import the map view to prevent re-initialization
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gang-highlight"></div>
    </div>
  ),
})

interface TurfZone {
  id: string
  name: string
  description?: string
  coordinates: any
  status: 'CONTROLLED' | 'CONTESTED' | 'NEUTRAL' | 'LOST'
  controlledBy?: string
  contestedBy: string[]
  history: any[]
}

// Removed MapUpdater component - not needed with dynamic import

export default function TurfMap() {
  const [zones, setZones] = useState<TurfZone[]>([])
  const [selectedZone, setSelectedZone] = useState<TurfZone | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadZones()
    
    // Subscribe to real-time updates (if Pusher is configured)
    if (!pusherClient) return

    const channel = pusherClient.subscribe(PUSHER_CHANNELS.TURF)
    channel.bind(PUSHER_EVENTS.TURF_UPDATE, (updatedZone: TurfZone) => {
      setZones((prev) => 
        prev.map((zone) => zone.id === updatedZone.id ? updatedZone : zone)
      )
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [])

  const loadZones = async () => {
    try {
      const response = await fetch('/api/turf')
      const data = await response.json()
      setZones(data)
    } catch (error) {
      console.error('Error loading turf zones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getZoneColor = (status: string) => {
    switch (status) {
      case 'CONTROLLED':
        return '#4ade80'
      case 'CONTESTED':
        return '#fb923c'
      case 'LOST':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  // Los Angeles center coordinates
  const center: LatLngExpression = [34.0522, -118.2437]

  if (isLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gang-highlight mx-auto mb-4"></div>
          <p className="text-gray-400">Loading turf map...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <Card className="h-[600px] overflow-hidden p-0">
        <MapView
          zones={zones}
          center={center}
          onZoneClick={setSelectedZone}
          getZoneColor={getZoneColor}
        />
      </Card>

      {/* Legend */}
      <Card>
        <h3 className="font-bold text-lg mb-3 text-white">Territory Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ade80' }}></div>
            <span className="text-sm text-gray-300">Controlled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
            <span className="text-sm text-gray-300">Contested</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }}></div>
            <span className="text-sm text-gray-300">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-sm text-gray-300">Lost</span>
          </div>
        </div>
      </Card>

      {/* Zone Details */}
      {selectedZone && (
        <Card variant="elevated">
          <h3 className="font-bold text-xl mb-3 text-white">{selectedZone.name}</h3>
          <p className="text-gray-300 mb-4">{selectedZone.description}</p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="px-3 py-1 rounded text-sm font-semibold"
                style={{ backgroundColor: getZoneColor(selectedZone.status) }}
              >
                {selectedZone.status}
              </span>
            </div>
            {selectedZone.controlledBy && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Controlled by:</span>
                <span className="text-white font-semibold">{selectedZone.controlledBy}</span>
              </div>
            )}
          </div>

          {selectedZone.history.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {selectedZone.history.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="bg-gang-primary/30 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gang-highlight">
                        {event.action.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-300 mt-1">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-gang-green mb-1">
            {zones.filter(z => z.status === 'CONTROLLED').length}
          </div>
          <div className="text-sm text-gray-400">Controlled</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-orange-500 mb-1">
            {zones.filter(z => z.status === 'CONTESTED').length}
          </div>
          <div className="text-sm text-gray-400">Contested</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-gray-500 mb-1">
            {zones.filter(z => z.status === 'NEUTRAL').length}
          </div>
          <div className="text-sm text-gray-400">Neutral</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-red-500 mb-1">
            {zones.filter(z => z.status === 'LOST').length}
          </div>
          <div className="text-sm text-gray-400">Lost</div>
        </Card>
      </div>
    </div>
  )
}
