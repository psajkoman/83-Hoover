'use client'

import Card from '@/components/ui/Card'
import { Shield, Clock, Users, Target, AlertCircle } from 'lucide-react'

interface Regulations {
  attacking_cooldown_hours: number
  pk_cooldown_type: string
  pk_cooldown_days: number | null
  max_participants: number
  max_assault_rifles: number
  weapon_restrictions: string
}

interface WarRegulationsProps {
  warType: string
  regulations: Regulations
}

export default function WarRegulations({ warType, regulations }: WarRegulationsProps) {
  const isControlled = warType === 'CONTROLLED'

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gang-gold" />
          <h3 className="font-bold text-xl text-white">War Regulations</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isControlled
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-gang-accent/20 text-gray-300'
          }`}
        >
          {warType}
        </span>
      </div>

      {isControlled && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-300">
            Custom regulations set by faction leadership for this specific war
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Attacking Cooldown */}
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-gang-highlight flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-white font-medium">Attacking Cooldown</div>
            <div className="text-sm text-gray-400">
              {regulations.attacking_cooldown_hours} hours between attacks
            </div>
          </div>
        </div>

        {/* PK Cooldown */}
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-white font-medium">Player Kill Cooldown</div>
            <div className="text-sm text-gray-400">
              {regulations.pk_cooldown_type === 'permanent'
                ? 'Permanent - Once killed, cannot be killed again'
                : `${regulations.pk_cooldown_days} days - Players can be killed again after cooldown`}
            </div>
          </div>
        </div>

        {/* Max Participants */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-gang-green flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-white font-medium">Maximum Participants</div>
            <div className="text-sm text-gray-400">
              {regulations.max_participants} members per attack
            </div>
          </div>
        </div>

        {/* Weapon Restrictions */}
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-white font-medium">Weapon Restrictions</div>
            <div className="text-sm text-gray-400">
              {regulations.weapon_restrictions}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Max {regulations.max_assault_rifles} assault rifles allowed
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
