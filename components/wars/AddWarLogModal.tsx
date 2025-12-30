'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Users, Skull, FileText, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns';
import { useSession } from 'next-auth/react'
import { useTimezone } from '@/contexts/TimezoneContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface AddWarLogModalProps {
  warId: string
  onClose: () => void
  onSuccess: () => void
}

interface DiscordMember {
  id: string
  username: string
  discriminator: string
  nickname: string | null
}

export default function AddWarLogModal({ warId, onClose, onSuccess }: AddWarLogModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const { data: session } = useSession()
  const { getCurrentTime, formatDateTime, formatTime } = useTimezone()
  const [isOpen, setIsOpen] = useState(true)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isOpen) {
        // Save the current scroll position
        const scrollY = window.scrollY;
        // Lock the body
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        // Cleanup function to restore scrolling
        return () => {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          window.scrollTo(0, scrollY);
        };
      }
    }
  }, [isOpen]);

  const getCurrentServerTime = () => {
    return new Date(getCurrentTime())
  }

  const isFutureDateTime = (dateStr: string, timeStr: string) => {
  const serverTime = getCurrentServerTime();
  const serverDate = format(serverTime, 'yyyy-MM-dd');
  const serverTimeStr = format(serverTime, 'HH:mm');
  
  if (dateStr > serverDate) return true;
  if (dateStr === serverDate && timeStr > serverTimeStr) return true;
  
  return false;
};
  
  const now = getCurrentServerTime()
  const [formData, setFormData] = useState({
    date: formatDateTime(now).split(',')[0],
    time: formatTime(now),
    log_type: 'ATTACK' as 'ATTACK' | 'DEFENSE',
    members_involved: '',
    friends_involved: '',
    players_killed: '',
    notes: '',
    evidence_url: '',
  })

  const [showMembersDropdown, setShowMembersDropdown] = useState(false)
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false)
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const [selectedKilledMembers, setSelectedKilledMembers] = useState<Record<string, boolean>>({})

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

  const syncKilledMembersToFriendsField = (nextSelected: Record<string, boolean>, membersList: string) => {
    const members = membersList
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    const killed = members.filter((m) => nextSelected[m])
    setFormData((prev) => ({
      ...prev,
      friends_involved: killed.join(', '),
    }))
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
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    const shouldShow = lastWord.length >= 2
    setShowFriendsDropdown(shouldShow)
    if (shouldShow) {
      setActiveDropdown('friends')
      // Reset selection when typing
      setSelectedSuggestionIndex(-1)
    } else {
      setActiveDropdown(null)
    }
  }

  const handleMembersChange = (value: string) => {
    setFormData({ ...formData, members_involved: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    const shouldShow = lastWord.length >= 2
    setShowMembersDropdown(shouldShow)
    if (shouldShow) {
      setActiveDropdown('members')
      // Reset selection when typing
      setSelectedSuggestionIndex(-1)
    } else {
      setActiveDropdown(null)
    }
  }

  const handlePlayersChange = (value: string) => {
    setFormData({ ...formData, players_killed: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    const shouldShow = lastWord.length >= 2
    setShowPlayersDropdown(shouldShow)
    if (shouldShow) {
      setActiveDropdown('players')
      // Reset selection when typing
      setSelectedSuggestionIndex(-1)
    } else {
      setActiveDropdown(null)
    }
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
    setActiveDropdown(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if the selected date/time is in the future
    if (isFutureDateTime(formData.date, formData.time)) {
      alert('Cannot create a log with a future date/time.')
      return
    }
    
    // Parse the date and time to a proper ISO string
    const [hours, minutes] = formData.time.split(':').map(Number)
    const date = new Date(formData.date)
    date.setHours(hours, minutes, 0, 0)
    
    // The date is already in the correct timezone based on user preference
    const isoDate = date.toISOString()
    setIsLoading(true)

    try {
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
      
      // Parse players killed (comma-separated, optional)
      const playersKilled = formData.players_killed
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
      
      // Validate: Either "Firstname Lastname" format (allowing multiple caps) OR @DiscordName
      const namePattern = /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+$/;
      const discordNamePattern = /^@[a-zA-Z0-9._-]+(?:#[0-9]{4})?$/;  // Must start with @
      
      const validateNames = (names: string[]) => {
        return names.filter(name => {
          // Allow if it matches the name pattern (allowing multiple caps like 'LaDorian Hall')
          if (namePattern.test(name)) return false
          // Allow if it starts with @ and is a valid Discord name
          if (discordNamePattern.test(name)) return false
          // Reject everything else
          return true
        })
      }

      if (membersInvolved.length === 0) {
        alert(`'Members Involved (Low West Crew)' is required`)
        setIsLoading(false)
        return
      }

      const invalidMembers = validateNames(membersInvolved)
      if (invalidMembers.length > 0) {
        alert(`Invalid name format in 'Members Involved (Low West Crew)': ${invalidMembers.join(', ')}\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
        setIsLoading(false)
        return
      }
      
      // Only validate friends as required, players_killed is optional
      if (friendsArray.length > 0) {
        const invalidFriends = validateNames(friendsArray)
        if (invalidFriends.length > 0) {
          alert(`Invalid name format in 'Players Killed (Low West Crew)': ${invalidFriends.join(', ')}\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
          setIsLoading(false)
          return
        }
      }
      
      // Only validate players_killed if there are any names provided
      if (playersKilled.length > 0) {
        const invalidPlayers = validateNames(playersKilled)
        if (invalidPlayers.length > 0) {
          alert(`Invalid name format in 'Players Killed (Enemy)': ${invalidPlayers.join(', ')}\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
          setIsLoading(false)
          return
        }
      }

      // Combine date and time into a single Date object
      const [hours, minutes] = formData.time.split(':').map(Number)
      const logDate = new Date(formData.date)
      logDate.setHours(hours, minutes, 0, 0)
      
      // Submit the log to your API
      const res = await fetch(`/api/wars/${warId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: logDate.toISOString(),
          log_type: formData.log_type,
          members_involved: membersInvolved,
          friends_involved: friendsArray,
          players_killed: playersKilled,
          notes: formData.notes || null,
          evidence_url: formData.evidence_url || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to submit log')
      }

      await res.json().catch(() => ({}))

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error submitting war log:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit log')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gang-secondary border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gang-secondary border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Add Encounter Log</h2>
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
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (isFutureDateTime(newDate, formData.time)) {
                  const now = getCurrentServerTime();
                  setFormData(prev => ({
                    ...prev,
                    date: format(now, 'yyyy-MM-dd'),
                    time: format(now, 'HH:mm')
                  }));
                } else {
                  setFormData(prev => ({ ...prev, date: newDate }));
                }
                }}
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
                onChange={(e) => {
                  const newTime = e.target.value;
                  if (isFutureDateTime(formData.date, newTime)) {
                    const now = getCurrentServerTime();
                    setFormData(prev => ({
                      ...prev,
                      date: format(now, 'yyyy-MM-dd'),
                      time: format(now, 'HH:mm')
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, time: newTime }));
                  }
                }}
                required
              />
            </div>
          </div>

          {/* Members Involved */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Members Involved (Low West Crew)
            </label>

            <Input
              type="text"
              value={formData.members_involved}
              onChange={(e) => handleMembersChange(e.target.value)}
              onBlur={() => setTimeout(() => {
                setShowMembersDropdown(false)
                setActiveDropdown(null)
              }, 200)}
              onKeyDown={(e) => {
                const suggestions = getFilteredMembers(formData.members_involved.split(',').pop()?.trim() || '')
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev >= 0 ? prev : 0
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0)
                } else if (e.key === 'Enter' && activeDropdown === 'members' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                  e.preventDefault()
                  insertSuggestion('members', suggestions[selectedSuggestionIndex].nickname || suggestions[selectedSuggestionIndex].username)
                } else if (e.key === 'Escape') {
                  setShowMembersDropdown(false)
                  setActiveDropdown(null)
                }
              }}
              required
            />

            {showMembersDropdown && (() => {
              const words = formData.members_involved.split(',')
              const lastWord = words[words.length - 1].trim()
              const suggestions = getFilteredMembers(lastWord)
              return suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((member, index) => {
                    const serverName = member.nickname || member.username
                    const showUsername = member.nickname && member.username !== member.nickname
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertSuggestion('members', serverName)}
                        className={`w-full px-4 py-2 text-left transition-colors text-white text-sm ${
                          activeDropdown === 'members' && 
                          selectedSuggestionIndex === index 
                            ? 'bg-gang-accent/40' 
                            : 'hover:bg-gang-accent/20'
                        }`}
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

            {(() => {
              const membersList = formData.members_involved
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p.length > 0)

              if (membersList.length === 0) return null

              return (
                <div className="mt-3 p-3 bg-gang-primary/40 border border-gang-accent/20 rounded-lg">
                  <div className="text-xs text-gray-300 mb-2">
                    Select killed members (optional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {membersList.map((memberName) => (
                      <label key={memberName} className="flex items-center gap-2 text-sm text-gray-200">
                        <input
                          type="checkbox"
                          checked={!!selectedKilledMembers[memberName]}
                          onChange={(e) => {
                            const next = {
                              ...selectedKilledMembers,
                              [memberName]: e.target.checked,
                            }
                            setSelectedKilledMembers(next)
                            syncKilledMembersToFriendsField(next, formData.members_involved)
                          }}
                        />
                        <span>{memberName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Low West Crew Killed */}
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
              onBlur={() => setTimeout(() => {
                setShowFriendsDropdown(false)
                setActiveDropdown(null)
              }, 200)}
              onKeyDown={(e) => {
                const suggestions = getFilteredMembers(formData.friends_involved.split(',').pop()?.trim() || '')
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev >= 0 ? prev : 0
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0)
                } else if (e.key === 'Enter' && activeDropdown === 'friends' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                  e.preventDefault()
                  insertSuggestion('friends', suggestions[selectedSuggestionIndex].nickname || suggestions[selectedSuggestionIndex].username)
                } else if (e.key === 'Escape') {
                  setShowFriendsDropdown(false)
                  setActiveDropdown(null)
                }
              }}
            />
            
            {showFriendsDropdown && (() => {
              const words = formData.friends_involved.split(',')
              const lastWord = words[words.length - 1].trim()
              const suggestions = getFilteredMembers(lastWord)
              return suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((member, index) => {
                    const serverName = member.nickname || member.username
                    const showUsername = member.nickname && member.username !== member.nickname
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertSuggestion('friends', serverName)}
                        className={`w-full px-4 py-2 text-left transition-colors text-white text-sm ${
                          activeDropdown === 'friends' && 
                          selectedSuggestionIndex === index 
                            ? 'bg-gang-accent/40' 
                            : 'hover:bg-gang-accent/20'
                        }`}
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
              onBlur={() => setTimeout(() => {
                setShowPlayersDropdown(false)
                setActiveDropdown(null)
              }, 200)}
              onKeyDown={(e) => {
                const suggestions = getFilteredMembers(formData.players_killed.split(',').pop()?.trim() || '')
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev >= 0 ? prev : 0
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0)
                } else if (e.key === 'Enter' && activeDropdown === 'players' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                  e.preventDefault()
                  insertSuggestion('players', suggestions[selectedSuggestionIndex].nickname || suggestions[selectedSuggestionIndex].username)
                } else if (e.key === 'Escape') {
                  setShowPlayersDropdown(false)
                  setActiveDropdown(null)
                }
              }}
            />
            
            {showPlayersDropdown && (() => {
              const words = formData.players_killed.split(',')
              const lastWord = words[words.length - 1].trim()
              const suggestions = getFilteredMembers(lastWord)
              return suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((member, index) => {
                    const serverName = member.nickname || member.username
                    const showUsername = member.nickname && member.username !== member.nickname
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertSuggestion('players', serverName)}
                        className={`w-full px-4 py-2 text-left transition-colors text-white text-sm ${
                          activeDropdown === 'players' && 
                          selectedSuggestionIndex === index 
                            ? 'bg-gang-accent/40' 
                            : 'hover:bg-gang-accent/20'
                        }`}
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
              // placeholder="Additional details about the encounter..."
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
              // placeholder="Imgur, YouTube, Streamable or similar are preferred"
              value={formData.evidence_url}
              onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated links. Paste image URL first, if applicable, then video in the end.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isLoading} className="flex-1">
              Add Log
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
