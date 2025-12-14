'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Swords, Plus, Edit2, X } from 'lucide-react'
import StartWarModal from './StartWarModal'

interface War {
  id: string
  slug?: string
  enemy_faction: string
  status: string
  war_type?: string
  war_level?: string
  started_at: string
  ended_at: string | null
}

export default function WarManagement() {
  const [wars, setWars] = useState<War[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWar, setEditingWar] = useState<War & { hasKills?: boolean } | null>(null)
  const [editWarType, setEditWarType] = useState<'UNCONTROLLED' | 'CONTROLLED'>('UNCONTROLLED')
  const [editWarLevel, setEditWarLevel] = useState<'NON_LETHAL' | 'LETHAL'>('NON_LETHAL')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isCheckingKills, setIsCheckingKills] = useState(false)

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

  const getWarLevelLabel = (level?: string) => {
    return level === 'LETHAL' ? 'Lethal' : 'Non-lethal'
  }

  const getWarLevelClasses = (level?: string) => {
    return level === 'LETHAL'
      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      : 'bg-gang-green/20 text-gang-green border border-gang-green/30'
  }

  const getWarTypeClasses = (type?: string) => {
    return type === 'CONTROLLED'
      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      : 'bg-gang-accent/20 text-gray-300 border border-gray-600/30'
  }

  const openEditWar = async (war: War) => {
    setIsCheckingKills(true)
    try {
      // Check if war has any kills
      const res = await fetch(`/api/wars/${war.id}/logs?hasKills=true`)
      const data = await res.json()
      
      setEditingWar({
        ...war,
        hasKills: data.hasKills
      })
      
      // If war has kills, force LETHAL level
      const newWarLevel = data.hasKills ? 'LETHAL' : ((war.war_level as any) === 'LETHAL' ? 'LETHAL' : 'NON_LETHAL')
      setEditWarLevel(newWarLevel)
      setEditWarType((war.war_type as any) === 'CONTROLLED' ? 'CONTROLLED' : 'UNCONTROLLED')
    } catch (error) {
      console.error('Error checking for kills:', error)
      // Default to original behavior if there's an error
      setEditingWar(war)
      setEditWarType((war.war_type as any) === 'CONTROLLED' ? 'CONTROLLED' : 'UNCONTROLLED')
      setEditWarLevel((war.war_level as any) === 'LETHAL' ? 'LETHAL' : 'NON_LETHAL')
    } finally {
      setIsCheckingKills(false)
    }
  }

  const closeEditWar = () => {
    if (isSavingEdit) return
    setEditingWar(null)
  }

  const saveWarEdits = async () => {
    if (!editingWar) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/wars/${editingWar.slug || editingWar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ war_type: editWarType, war_level: editWarLevel }),
      })

      if (res.ok) {
        setEditingWar(null)
        fetchWars()
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Failed to update war')
      }
    } catch (error) {
      console.error('Error updating war:', error)
      alert('Failed to update war')
    } finally {
      setIsSavingEdit(false)
    }
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
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarLevelClasses(war.war_level)}`}>
                    {getWarLevelLabel(war.war_level)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarTypeClasses(war.war_type)}`}>
                    {(war.war_type || 'UNCONTROLLED').toString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditWar(war)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleEndWar(war.slug || war.id)}
                >
                  End War
                </Button>
              </div>
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

      {editingWar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-lg w-full">
            <div className="border-b border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit War</h3>
              <button
                onClick={closeEditWar}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                disabled={isSavingEdit}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-400">
                {editingWar.enemy_faction}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">War Level</label>
                <select
                  value={editWarLevel}
                  onChange={(e) => setEditWarLevel(e.target.value as 'NON_LETHAL' | 'LETHAL')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight disabled:opacity-50"
                  disabled={isSavingEdit || editingWar?.hasKills}
                >
                  <option value="NON_LETHAL" disabled={editingWar?.hasKills}>
                    {editingWar?.hasKills ? 'Non-lethal (disabled - kills exist)' : 'Non-lethal'}
                  </option>
                  <option value="LETHAL">Lethal</option>
                </select>
                {editingWar?.hasKills && (
                  <p className="mt-1 text-xs text-orange-400">
                    Cannot set to non-lethal because this war has recorded kills.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">War Type</label>
                <select
                  value={editWarType}
                  onChange={(e) => setEditWarType(e.target.value as 'UNCONTROLLED' | 'CONTROLLED')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
                  disabled={isSavingEdit}
                >
                  <option value="UNCONTROLLED">Uncontrolled</option>
                  <option value="CONTROLLED">Controlled</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveWarEdits} isLoading={isSavingEdit} className="flex-1">
                  Save
                </Button>
                <Button type="button" variant="ghost" onClick={closeEditWar} disabled={isSavingEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
