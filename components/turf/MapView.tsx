'use client'

import { useRef, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

interface MapViewProps {
  zones: TurfZone[]
  center: LatLngExpression
  onZoneClick: (zone: TurfZone) => void
  getZoneColor: (status: string) => string
}

// Component to update zones without re-mounting the map
function ZoneLayer({ zones, onZoneClick, getZoneColor }: Omit<MapViewProps, 'center'>) {
  return (
    <>
      {zones.map((zone) => {
        const coordinates = zone.coordinates.coordinates[0].map(
          (coord: number[]) => [coord[1], coord[0]] as LatLngExpression
        )
        
        return (
          <Polygon
            key={zone.id}
            positions={coordinates}
            pathOptions={{
              color: getZoneColor(zone.status),
              fillColor: getZoneColor(zone.status),
              fillOpacity: 0.4,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onZoneClick(zone),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-1">{zone.name}</h3>
                <p className="text-sm mb-2">{zone.description}</p>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Status:</span>{' '}
                    <span className={`px-2 py-0.5 rounded text-xs`}
                      style={{ backgroundColor: getZoneColor(zone.status) }}
                    >
                      {zone.status}
                    </span>
                  </div>
                  {zone.controlledBy && (
                    <div>
                      <span className="font-semibold">Controlled by:</span> {zone.controlledBy}
                    </div>
                  )}
                  {zone.contestedBy.length > 0 && (
                    <div>
                      <span className="font-semibold">Contested by:</span> {zone.contestedBy.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Polygon>
        )
      })}
    </>
  )
}

// Map component that only mounts once
export default function MapView({ zones, center, onZoneClick, getZoneColor }: MapViewProps) {
  const [mapMounted, setMapMounted] = useState(false)

  useEffect(() => {
    setMapMounted(true)
  }, [])

  if (!mapMounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gang-highlight"></div>
      </div>
    )
  }

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <ZoneLayer zones={zones} onZoneClick={onZoneClick} getZoneColor={getZoneColor} />
    </MapContainer>
  )
}
