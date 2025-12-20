'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Swords, Plus, Edit2, X } from 'lucide-react'
import StartWarModal from './StartWarModal'
import type { War, WarApiResponse } from '@/types/war'

export default function WarManagement() {
  const [wars, setWars] = useState<War[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWar, setEditingWar] = useState<War & { hasKills?: boolean } | null>(null)
  const [editWarType, setEditWarType] = useState<'UNCONTROLLED' | 'CONTROLLED'>('UNCONTROLLED')
  const [editWarLevel, setEditWarLevel] = useState<'NON_LETHAL' | 'LETHAL'>('NON_LETHAL')
  const [editEnemyFaction, setEditEnemyFaction] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isCheckingKills, setIsCheckingKills] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch('/api/user/role')
        const data = await res.json()
        setUserRole(data.role)
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    fetchUserRole()
    fetchWars()
  }, [])

  const fetchWars = async () => {
    setIsLoading(true)
    try {
      // Fetch both active and pending wars
      const [activeRes, pendingRes] = await Promise.all([
        fetch('/api/wars?status=ACTIVE'),
        fetch('/api/wars?status=PENDING')
      ])
      
      const activeData = await activeRes.json()
      const pendingData = await pendingRes.json()
      
      // Combine and sort by created_at (newest first)
      const allWars = [...(activeData.wars || []), ...(pendingData.wars || [])]
      allWars.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setWars(allWars)
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
      setEditEnemyFaction(war.enemy_faction)
    } catch (error) {
      console.error('Error checking for kills:', error)
      // Default to original behavior if there's an error
      setEditingWar(war)
      setEditWarType((war.war_type as any) === 'CONTROLLED' ? 'CONTROLLED' : 'UNCONTROLLED')
      setEditWarLevel((war.war_level as any) === 'LETHAL' ? 'LETHAL' : 'NON_LETHAL')
      setEditEnemyFaction(war.enemy_faction)
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
    
    if (!editEnemyFaction.trim()) {
      alert('Enemy faction name cannot be empty')
      return
    }
    
    setIsSavingEdit(true)
    try {
      const warId = 'slug' in editingWar && editingWar.slug ? editingWar.slug : editingWar.id
      const res = await fetch(`/api/wars/${warId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          war_type: editWarType, 
          war_level: editWarLevel,
          enemy_faction: editEnemyFaction.trim()
        }),
      })

      if (res.ok) {
        const data: WarApiResponse = await res.json()
        const updatedWar = data.war
        setEditingWar(null)
        fetchWars()
        
        // If we're on the war detail page, redirect to the new URL
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/wars/')) {
          const newPath = `/wars/${updatedWar.slug || updatedWar.id}`
          if (window.location.pathname !== newPath) {
            window.history.pushState({}, '', newPath)
          }
        }
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

  const handleEndWar = async (war: War) => {
    const isPending = war.status === 'PENDING'
    const confirmMessage = isPending 
      ? 'Are you sure you want to delete this pending war? This action will permanently remove it from the database.'
      : 'Are you sure you want to end this war?'
    
    if (!window.confirm(confirmMessage)) return

    try {
      if (isPending) {
        // For pending wars, perform a DELETE request
        const res = await fetch(`/api/wars/${war.slug || war.id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to delete war')
        }
      } else {
        // For active wars, mark as ended
        const res = await fetch(`/api/wars/${war.slug || war.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ENDED' }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to end war')
        }
      }
      
      // Refresh the wars list
      fetchWars()
    } catch (error: any) {
      console.error(`Error ${isPending ? 'deleting' : 'ending'} war:`, error)
      alert(error?.message || `Failed to ${isPending ? 'delete' : 'end'} war`)
    }
  }

  const handleApproveWar = async (warId: string) => {
    if (!confirm('Are you sure you want to approve this war?')) return

    try {
      const res = await fetch(`/api/wars/${warId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'ACTIVE',
          is_approved: true 
        }),
      })

      if (res.ok) {
        fetchWars()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to approve war')
      }
    } catch (error) {
      console.error('Error approving war:', error)
      alert('Failed to approve war')
    }
  }
 
  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-gang-highlight" />
          <h3 className="font-bold text-xl text-white">War Management</h3>
        </div>
        {true && (
          <Button onClick={() => setShowAddModal(true)} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Start War
          </Button>
        )}
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
                <Link href={`/wars/${war.slug || war.id}`} className="text-white font-medium hover:text-gang-highlight transition-colors">
                  {war.enemy_faction}
                </Link>
                <div className="text-xs text-gray-400">
                  Started {new Date(war.started_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {war.status === 'PENDING' && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                      PENDING
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarLevelClasses(war.war_level)}`}>
                    {getWarLevelLabel(war.war_level)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarTypeClasses(war.war_type)}`}>
                    {(war.war_type || 'UNCONTROLLED').toString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {war.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApproveWar(war.slug || war.id)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                )}
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
                  onClick={() => handleEndWar(war)}
                >
                  {war.status === 'PENDING' ? 'Delete' : 'End War'}
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enemy Faction Name
                </label>
                <input
                  type="text"
                  value={editEnemyFaction}
                  onChange={(e) => setEditEnemyFaction(e.currentTarget.value)}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight disabled:opacity-50"
                  disabled={isSavingEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  War Level
                </label>
                <select
                  value={editWarLevel}
                  onChange={(e) => setEditWarLevel(e.currentTarget.value as 'NON_LETHAL' | 'LETHAL')}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  War Type
                </label>
                <select
                  value={editWarType}
                  onChange={(e) => setEditWarType(e.currentTarget.value as 'UNCONTROLLED' | 'CONTROLLED')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight disabled:opacity-50"
                  disabled={isSavingEdit}
                >
                  <option value="UNCONTROLLED">Uncontrolled</option>
                  <option value="CONTROLLED">Controlled</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={saveWarEdits} 
                  isLoading={isSavingEdit} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={closeEditWar} 
                  disabled={isSavingEdit}
                >
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
