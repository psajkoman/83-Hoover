'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Users, Skull, FileText, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface EditWarLogModalProps {
  warId: string
  log: {
    id: string
    date_time: string
    log_type: string
    friends_involved: string[]
    players_killed: string[]
    notes: string | null
    evidence_url: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

interface DiscordMember {
  id: string
  username: string
  discriminator: string
  nickname: string | null
}

export default function EditWarLogModal({ warId, log, onClose, onSuccess }: EditWarLogModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  
  // Parse date_time into date and time
  const dateObj = new Date(log.date_time)
  const initialDate = dateObj.toISOString().split('T')[0]
  const initialTime = dateObj.toTimeString().slice(0, 5)
  
  const [formData, setFormData] = useState({
    date: initialDate,
    time: initialTime,
    log_type: log.log_type as 'ATTACK' | 'DEFENSE',
    friends_involved: log.friends_involved.join(', '),
    players_killed: log.players_killed.join(', '),
    notes: log.notes || '',
    evidence_url: log.evidence_url || '',
  })

  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false)
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false)

  useEffect(() => {
    fetchDiscordMembers()
  }, [])

  const fetchDiscordMembers = async () => {
    try {
      const res = await fetch('/api/discord/members')
      const data = await res.json()
      if (data.members) {
        setDiscordMembers(data.members)
      }
    } catch (error) {
      console.error('Error fetching Discord members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const getFilteredMembers = (input: string) => {
    if (!input || input.length < 2) return []
    const searchTerm = input.toLowerCase()
    return discordMembers.filter((member) => {
      // Search by both server nickname and native username
      const serverName = member.nickname || member.username
      const nativeUsername = member.username
      return serverName.toLowerCase().includes(searchTerm) || 
             nativeUsername.toLowerCase().includes(searchTerm)
    }).slice(0, 5) // Limit to 5 suggestions
  }

  const handleFriendsChange = (value: string) => {
    setFormData({ ...formData, friends_involved: value })
    // Get the last word being typed (after last comma)
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowFriendsDropdown(lastWord.length >= 2)
  }

  const handlePlayersChange = (value: string) => {
    setFormData({ ...formData, players_killed: value })
    // Get the last word being typed (after last comma)
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowPlayersDropdown(lastWord.length >= 2)
  }

  const insertSuggestion = (field: 'friends' | 'players', suggestion: string) => {
    const currentValue = field === 'friends' ? formData.friends_involved : formData.players_killed
    const words = currentValue.split(',').map(w => w.trim())
    words[words.length - 1] = suggestion
    const newValue = words.join(', ')
    
    if (field === 'friends') {
      setFormData({ ...formData, friends_involved: newValue + ', ' })
      setShowFriendsDropdown(false)
    } else {
      setFormData({ ...formData, players_killed: newValue + ', ' })
      setShowPlayersDropdown(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString()

      // Parse comma-separated strings into arrays
      const friendsArray = formData.friends_involved
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      const playersKilled = formData.players_killed
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      // Validate: Either "Firstname Lastname" format OR @DiscordName
      const firstnameLastnamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/
      const discordNamePattern = /^@[A-Za-z0-9_]{2,}$/  // Must start with @

      const validateNames = (names: string[]) => {
        return names.filter(name => {
          // Allow if it matches "Firstname Lastname" format
          if (firstnameLastnamePattern.test(name)) return false
          // Allow if it starts with @ and is a valid Discord name
          if (discordNamePattern.test(name)) return false
          // Reject everything else
          return true
        })
      }

      const invalidFriends = validateNames(friendsArray)
      const invalidPlayers = validateNames(playersKilled)

      if (invalidFriends.length > 0 || invalidPlayers.length > 0) {
        const allInvalid = [...invalidFriends, ...invalidPlayers]
        alert(`Invalid name format: ${allInvalid.join(', ')}\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
        setIsLoading(false)
        return
      }

      const res = await fetch(`/api/wars/${warId}/logs/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: dateTime,
          log_type: formData.log_type,
          friends_involved: friendsArray,
          players_killed: playersKilled,
          notes: formData.notes || null,
          evidence_url: formData.evidence_url || null,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update log')
      }
    } catch (error) {
      console.error('Error updating log:', error)
      alert('Failed to update log')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gang-secondary border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Edit Encounter Log</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Log Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Encounter Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, log_type: 'ATTACK' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.log_type === 'ATTACK'
                    ? 'border-gang-highlight bg-gang-highlight/10 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="font-semibold">Attack</span>
                <p className="text-xs mt-1">We attacked them</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, log_type: 'DEFENSE' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.log_type === 'DEFENSE'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="font-semibold">Defense</span>
                <p className="text-xs mt-1">They attacked us</p>
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time
              </label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Low West Crew Involved */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Players Killed (Low West Crew)
            </label>
            
            <Input
              type="text"
              placeholder="Start typing to see Discord suggestions..."
              value={formData.friends_involved}
              onChange={(e) => handleFriendsChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowFriendsDropdown(false), 200)}
              required
            />
            
            {showFriendsDropdown && (() => {
              const words = formData.friends_involved.split(',')
              const lastWord = words[words.length - 1].trim()
              const suggestions = getFilteredMembers(lastWord)
              return suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((member) => {
                    const serverName = member.nickname || member.username
                    const showUsername = member.nickname && member.username !== member.nickname
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertSuggestion('friends', serverName)}
                        className="w-full px-4 py-2 text-left hover:bg-gang-accent/20 transition-colors text-white text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gang-highlight">@</span>
                          <span className="font-medium">{serverName}</span>
                          {showUsername && (
                            <span className="text-xs text-gray-400">({member.username})</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
            
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated names. Discord suggestions appear as you type.
            </p>
          </div>

          {/* Players Killed */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Skull className="w-4 h-4 inline mr-2" />
              Players Killed (Enemy)
            </label>
            
            <Input
              type="text"
              placeholder="Start typing to see Discord suggestions..."
              value={formData.players_killed}
              onChange={(e) => handlePlayersChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowPlayersDropdown(false), 200)}
              required
            />
            
            {showPlayersDropdown && (() => {
              const words = formData.players_killed.split(',')
              const lastWord = words[words.length - 1].trim()
              const suggestions = getFilteredMembers(lastWord)
              return suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((member) => {
                    const serverName = member.nickname || member.username
                    const showUsername = member.nickname && member.username !== member.nickname
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertSuggestion('players', serverName)}
                        className="w-full px-4 py-2 text-left hover:bg-gang-accent/20 transition-colors text-white text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gang-highlight">@</span>
                          <span className="font-medium">{serverName}</span>
                          {showUsername && (
                            <span className="text-xs text-gray-400">({member.username})</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
            
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated names. Discord suggestions appear as you type.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gang-highlight focus:border-transparent transition-all min-h-[100px]"
              placeholder="Additional details about the encounter..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Evidence URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Evidence URL (Optional)
            </label>
            <Input
              type="url"
              placeholder="https://imgur.com/..."
              value={formData.evidence_url}
              onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" isLoading={isLoading} className="flex-1">
              Update Log
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
