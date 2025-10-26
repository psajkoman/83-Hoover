'use client'

import { useState, useEffect } from 'react'
import { X, Swords } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface StartWarModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function StartWarModal({ onClose, onSuccess }: StartWarModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [warType, setWarType] = useState<'UNCONTROLLED' | 'CONTROLLED'>('UNCONTROLLED')
  const [enemyFaction, setEnemyFaction] = useState('')
  
  // Controlled war regulations
  const [attackingCooldown, setAttackingCooldown] = useState(6)
  const [pkCooldownType, setPkCooldownType] = useState<'permanent' | 'days'>('permanent')
  const [pkCooldownDays, setPkCooldownDays] = useState(2)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [maxAssaultRifles, setMaxAssaultRifles] = useState(2)
  const [weaponRestrictions, setWeaponRestrictions] = useState('Max 2 assault rifles, rest allowed')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const body: any = {
        enemy_faction: enemyFaction,
        war_type: warType,
      }

      // Add custom regulations for controlled wars
      if (warType === 'CONTROLLED') {
        body.regulations = {
          attacking_cooldown_hours: attackingCooldown,
          pk_cooldown_type: pkCooldownType,
          pk_cooldown_days: pkCooldownType === 'days' ? pkCooldownDays : null,
          max_participants: maxParticipants,
          max_assault_rifles: maxAssaultRifles,
          weapon_restrictions: weaponRestrictions,
        }
      }

      const res = await fetch('/api/wars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to start war')
      }
    } catch (error) {
      console.error('Error starting war:', error)
      alert('Failed to start war')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-2xl w-full my-8">
        <div className="sticky top-0 bg-gang-secondary border-b border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">Start New War</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Enemy Faction */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enemy Faction Name
            </label>
            <Input
              type="text"
              placeholder="e.g., Eastside Hustler Crip"
              value={enemyFaction}
              onChange={(e) => setEnemyFaction(e.target.value)}
              required
            />
          </div>

          {/* War Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              War Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setWarType('UNCONTROLLED')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  warType === 'UNCONTROLLED'
                    ? 'border-gang-highlight bg-gang-highlight/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-white font-semibold mb-1">Uncontrolled</div>
                <div className="text-xs text-gray-400">Uses global regulations</div>
              </button>
              <button
                type="button"
                onClick={() => setWarType('CONTROLLED')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  warType === 'CONTROLLED'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-white font-semibold mb-1">Controlled</div>
                <div className="text-xs text-gray-400">Custom regulations</div>
              </button>
            </div>
          </div>

          {/* Custom Regulations for Controlled Wars */}
          {warType === 'CONTROLLED' && (
            <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="font-semibold text-white">Custom Regulations</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Attacking Cooldown (hours)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={attackingCooldown}
                    onChange={(e) => setAttackingCooldown(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Max Participants
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  PK Cooldown Type
                </label>
                <select
                  value={pkCooldownType}
                  onChange={(e) => setPkCooldownType(e.target.value as 'permanent' | 'days')}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gang-highlight"
                >
                  <option value="permanent">Permanent</option>
                  <option value="days">Days</option>
                </select>
              </div>

              {pkCooldownType === 'days' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    PK Cooldown (days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={pkCooldownDays}
                    onChange={(e) => setPkCooldownDays(parseInt(e.target.value))}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Max Assault Rifles
                </label>
                <Input
                  type="number"
                  min="0"
                  value={maxAssaultRifles}
                  onChange={(e) => setMaxAssaultRifles(parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Weapon Restrictions
                </label>
                <textarea
                  value={weaponRestrictions}
                  onChange={(e) => setWeaponRestrictions(e.target.value)}
                  className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight min-h-[80px]"
                  placeholder="Describe weapon restrictions..."
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              <Swords className="w-4 h-4 mr-2" />
              Start War
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
