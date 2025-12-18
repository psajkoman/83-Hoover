'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Users, Skull, FileText, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useTimezone } from '@/contexts/TimezoneContext'

interface EditWarLogModalProps {
  warId: string
  log: {
    id: string
    date_time: string
    log_type: string
    members_involved: string[]
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  
  const { formatDateTime, formatTime, useServerTime } = useTimezone()
  
  // Parse date_time into date and time
  const dateObj = new Date(log.date_time)
  const initialDate = formatDateTime(dateObj).split(',')[0]
  const initialTime = formatTime(dateObj)
  
  const [formData, setFormData] = useState({
    date: initialDate,
    time: initialTime,
    log_type: log.log_type as 'ATTACK' | 'DEFENSE',
    members_involved: log.members_involved.join(', '),
    friends_involved: log.friends_involved.join(', '),
    players_killed: log.players_killed.join(', '),
    notes: log.notes || '',
    evidence_url: log.evidence_url || '',
  })
  const [showMembersDropdown, setShowMembersDropdown] = useState(false)
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false)
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false)

  useEffect(() => {
    fetchDiscordMembers()
  }, [])

  useEffect(() => {
    console.log('Date display updated:', formatDateTime(new Date()))
  }, [useServerTime, formatDateTime])

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

  const handleMembersChange = (value: string) => {
    setFormData({ ...formData, members_involved: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowMembersDropdown(lastWord.length >= 2)
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

  const insertSuggestion = (field: 'members' | 'friends' | 'players', suggestion: string) => {
    const currentValue = 
      field === 'members' 
        ? formData.members_involved 
        : field === 'friends' 
          ? formData.friends_involved 
          : formData.players_killed
    const words = currentValue.split(',').map(w => w.trim())
    words[words.length - 1] = suggestion
    const newValue = words.join(', ')
    
    if (field === 'members') {
      setFormData({ ...formData, members_involved: newValue + ', ' })
      setShowMembersDropdown(false)
    } else if (field === 'friends') {
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
      const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString()
      // Parse members involved (comma-separated)
      const membersInvolved = formData.members_involved
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      // Parse friends (comma-separated)
      const friendsArray = formData.friends_involved
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      const playersKilled = formData.players_killed
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      // Validate names
      const namePattern = /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+$/
      const discordNamePattern = /^@[a-zA-Z0-9._-]+(?:#[0-9]{4})?$/

      const validateNames = (names: string[]) => {
        return names.filter(name => {
          if (namePattern.test(name)) return false
          if (discordNamePattern.test(name)) return false
          return true
        })
      }

      const invalidMembers = validateNames(membersInvolved)
      if (invalidMembers.length > 0) {
        alert(`Invalid name format in 'Members Involved': ${invalidMembers.join(', ')}\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
        setIsLoading(false)
        return
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
          members_involved: membersInvolved,
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

          {/* Members Involved */}
          <div className="relative mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Members Involved (Low West Crew)
            </label>
            <Input
              type="text"
              // placeholder="Start typing to see Discord suggestions..."
              value={formData.members_involved}
              onChange={(e) => handleMembersChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowMembersDropdown(false), 200)}
              required
            />
            
            {showMembersDropdown && (() => {
              const words = formData.members_involved.split(',')
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
                        onClick={() => insertSuggestion('members', serverName)}
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

          {/* Low West Crew Involved */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Players Killed (Low West Crew)
            </label>
            
            <Input
              type="text"
              // placeholder="Start typing to see Discord suggestions..."
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
              // placeholder="Start typing to see Discord suggestions..."
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
            {formData.evidence_url ? (
              <div className="mt-2">
                <div 
                  className="inline-block max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setZoomedImage(formData.evidence_url || '')}
                >
                  <img 
                    src={formData.evidence_url} 
                    alt="Evidence" 
                    className="max-h-40 rounded-lg border border-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-1 truncate">{formData.evidence_url}</p>
                </div>
                <Input
                  type="url"
                  placeholder="https://imgur.com/..."
                  value={formData.evidence_url}
                  onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                  className="mt-2"
                />
              </div>
            ) : (
              <Input
                type="url"
                placeholder="https://imgur.com/..."
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
              />
            )}
          </div>
          
          {/* Zoomed Image Modal */}
          {zoomedImage && (
            <div 
              className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
              onClick={() => setZoomedImage(null)}
            >
              <div className="relative max-w-full max-h-[90vh]">
                <img 
                  src={zoomedImage} 
                  alt="Zoomed evidence" 
                  className="max-w-full max-h-[90vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Close zoomed image"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          )}

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
