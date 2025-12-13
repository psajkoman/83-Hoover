'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Swords, Plus } from 'lucide-react'
import StartWarModal from './StartWarModal'

interface War {
  id: string
  slug?: string
  enemy_faction: string
  status: string
  started_at: string
  ended_at: string | null
}

export default function WarManagement() {
  const [wars, setWars] = useState<War[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchWars()
  }, [])

  const fetchWars = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/wars?status=ACTIVE')
      const data = await res.json()
      setWars(data.wars || [])
    } catch (error) {
      console.error('Error fetching wars:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWarCreated = () => {
    setShowAddModal(false)
    fetchWars()
  }

  const handleEndWar = async (warId: string) => {
    if (!confirm('Are you sure you want to end this war?')) return

    try {
      const res = await fetch(`/api/wars/${warId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      })

      if (res.ok) {
        fetchWars()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to end war')
      }
    } catch (error) {
      console.error('Error ending war:', error)
      alert('Failed to end war')
    }
  }

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-gang-highlight" />
          <h3 className="font-bold text-xl text-white">War Management</h3>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Start War
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-2">Loading wars...</p>
        </div>
      ) : wars.length === 0 ? (
        <div className="text-center py-8">
          <Swords className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No active wars</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wars.map((war) => (
            <div
              key={war.id}
              className="flex items-center justify-between p-3 bg-gang-primary/30 rounded-lg"
            >
              <div>
                <div className="text-white font-medium">{war.enemy_faction}</div>
                <div className="text-xs text-gray-400">
                  Started {new Date(war.started_at).toLocaleDateString()}
                </div>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleEndWar(war.slug || war.id)}
              >
                End War
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Start War Modal */}
      {showAddModal && (
        <StartWarModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleWarCreated}
        />
      )}
    </Card>
  )
}
