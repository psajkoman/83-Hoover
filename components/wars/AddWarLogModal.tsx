'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Users, Skull, FileText, Image as ImageIcon } from 'lucide-react'
import { format, parse } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { useSession } from 'next-auth/react'
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

  const getCurrentServerTime = () => {
    const now = new Date();
    return toZonedTime(now.toISOString(), 'Europe/London');
  }

  const isFutureDateTime = (dateStr: string, timeStr: string) => {
  const serverTime = getCurrentServerTime();
  const serverDate = format(serverTime, 'yyyy-MM-dd');
  const serverTimeStr = format(serverTime, 'HH:mm');
  
  if (dateStr > serverDate) return true;
  if (dateStr === serverDate && timeStr > serverTimeStr) return true;
  
  return false;
};
  
  const [formData, setFormData] = useState({
    date: format(getCurrentServerTime(), 'yyyy-MM-dd'),
    time: format(getCurrentServerTime(), 'HH:mm'),
    log_type: 'ATTACK' as 'ATTACK' | 'DEFENSE',
    friends_involved: '',
    players_killed: '',
    notes: '',
    evidence_url: '',
  })

  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false)
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)

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
    // Combine date and time in London timezone
    const serverDateTime = parse(
      `${formData.date} ${formData.time}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    
    const utcDateTime = fromZonedTime(serverDateTime, 'Europe/London');
    
    const timestamp = utcDateTime.toISOString()
    setIsLoading(true)

    try {
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString()

      // Parse friends and players killed (comma-separated)
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
        alert(`Invalid name format: ${allInvalid.join(', ')}\\nMust be "Firstname Lastname" (e.g., "John Doe") or @DiscordName (e.g., @Davion)`)
        setIsLoading(false)
        return
      }

      // First, submit the log to your API
      const res = await fetch(`/api/wars/${warId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: timestamp,
          log_type: formData.log_type,
          friends_involved: friendsArray,  // Use the parsed array instead of the raw string
          players_killed: playersKilled,   // Use the parsed array instead of the raw string
          notes: formData.notes || null,   // Ensure null is sent if empty
          evidence_url: formData.evidence_url || null,  // Ensure null is sent if empty
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to submit log')
      }

      // After successful submission, send to Discord
      try {
        const discordType = formData.log_type === 'ATTACK' ? 'ATTACK' : 'DEFENSE'
        const title = `${discordType} LOG — ${new Date(dateTime).toLocaleString()}`
        
        const fields = [
          { name: 'Our Deaths', value: formData.friends_involved || ' ', inline: true },
          { name: 'Enemy Deaths', value: formData.players_killed || ' ', inline: true }
        ]
        
        if (formData.notes) {
          fields.push({ name: 'Notes', value: formData.notes, inline: false })
        }
        
        if (formData.evidence_url) {
          fields.push({ name: 'Evidence', value: `[View Evidence] (${formData.evidence_url})`, inline: false })
        }

        const description = `${discordType} cooldown triggered`;
        // Parse the friends and enemies killed from your form data
        const friendsKilled = formData.friends_involved
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        const enemiesKilled = formData.players_killed
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        // Send to Discord
        await fetch('/api/encounter-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: discordType,
            title: title,
            description: description,
            war_id: warId,
            notes: formData.notes,
            evidence_url: formData.evidence_url,
            friends_killed: friendsKilled,
            enemies_killed: enemiesKilled,
            author: {
              username: session?.user?.name || 'Unknown',
              discordId: (session?.user as any)?.discordId,
              avatar: session?.user?.image // Make sure this is the Discord avatar URL
            }
          })
        });
      } catch (discordError) {
        console.error('Failed to send to Discord:', discordError)
        // Don't fail the whole operation if Discord fails
      }

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
