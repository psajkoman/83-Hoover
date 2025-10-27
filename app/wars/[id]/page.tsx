'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Swords, Calendar, Plus, ArrowLeft, Trash2, Edit2, Image as ImageIcon } from 'lucide-react'
import AddWarLogModal from '@/components/wars/AddWarLogModal'
import WarRegulations from '@/components/wars/WarRegulations'
import PlayerKillList from '@/components/wars/PlayerKillList'
import Image from 'next/image'

interface War {
  id: string
  enemy_faction: string
  status: string
  started_at: string
  ended_at: string | null
  war_type: string
  regulations: any
}

interface WarLog {
  id: string
  date_time: string
  log_type: string
  hoovers_involved: string[]
  players_killed: string[]
  notes: string | null
  evidence_url: string | null
  submitted_by: string
  edited_by: string | null
  edited_at: string | null
  created_at: string
  submitted_by_user: {
    username: string
    discord_id: string
    avatar: string | null
  }
  edited_by_user?: {
    username: string
    discord_id: string
    avatar: string | null
  } | null
}

export default function WarDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [war, setWar] = useState<War | null>(null)
  const [logs, setLogs] = useState<WarLog[]>([])
  const [pkList, setPkList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    log_type: string
    hoovers_involved: string
    players_killed: string
    notes: string
    evidence_url: string
  } | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [discordMembers, setDiscordMembers] = useState<any[]>([])
  const [showHooversDropdown, setShowHooversDropdown] = useState(false)
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false)

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user) return
      try {
        const res = await fetch('/api/user/role')
        const data = await res.json()
        setUserRole(data.role)
        console.log('User role fetched:', data.role)
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    fetchUserRole()
  }, [session])

  // Fetch Discord members
  useEffect(() => {
    const fetchDiscordMembers = async () => {
      try {
        const res = await fetch('/api/discord/members')
        const data = await res.json()
        if (data.members) {
          setDiscordMembers(data.members)
        }
      } catch (error) {
        console.error('Error fetching Discord members:', error)
      }
    }
    fetchDiscordMembers()
  }, [])

  const hooverKills = pkList.filter(p => p.faction === 'HOOVER').reduce((sum, p) => sum + p.kill_count, 0)
  const enemyKills = pkList.filter(p => p.faction === 'ENEMY').reduce((sum, p) => sum + p.kill_count, 0)

  const fetchWarDetails = useCallback(async () => {
    setIsLoading(true)
    try {
      const [warRes, logsRes, pkRes] = await Promise.all([
        fetch(`/api/wars/${params.id}`),
        fetch(`/api/wars/${params.id}/logs`),
        fetch(`/api/wars/${params.id}/pk-list`),
      ])

      const warData = await warRes.json()
      const logsData = await logsRes.json()
      const pkData = await pkRes.json()

      setWar(warData.war)
      setLogs(logsData.logs || [])
      setPkList(pkData.pkList || [])
    } catch (error) {
      console.error('Error fetching war details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchWarDetails()
  }, [fetchWarDetails])

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return

    try {
      const res = await fetch(`/api/wars/${params.id}/logs/${logId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setLogs(logs.filter((log) => log.id !== logId))
      }
    } catch (error) {
      console.error('Error deleting log:', error)
    }
  }

  const canEditLog = (log: WarLog) => {
    if (!session?.user) return false
    const userDiscordId = (session.user as any).discordId
    const userRole = (session.user as any).role
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)
    const isOwner = log.submitted_by_user.discord_id === userDiscordId
    return isAdmin || isOwner
  }

  const canDeleteLog = (log: WarLog) => {
    if (!session?.user || !userRole) return false
    return ['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)
  }

  const getFilteredMembers = (input: string) => {
    if (!input || input.length < 2) return []
    const searchTerm = input.toLowerCase()
    return discordMembers.filter((member: any) => {
      const serverName = member.nickname || member.username
      const nativeUsername = member.username
      return serverName.toLowerCase().includes(searchTerm) || 
             nativeUsername.toLowerCase().includes(searchTerm)
    }).slice(0, 5)
  }

  const handleHooversChange = (value: string) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, hoovers_involved: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowHooversDropdown(lastWord.length >= 2)
  }

  const handlePlayersChange = (value: string) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, players_killed: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowPlayersDropdown(lastWord.length >= 2)
  }

  const insertSuggestion = (field: 'hoovers' | 'players', suggestion: string) => {
    if (!editFormData) return
    const currentValue = field === 'hoovers' ? editFormData.hoovers_involved : editFormData.players_killed
    const words = currentValue.split(',').map(w => w.trim())
    words[words.length - 1] = suggestion
    const newValue = words.join(', ')
    
    if (field === 'hoovers') {
      setEditFormData({ ...editFormData, hoovers_involved: newValue + ', ' })
      setShowHooversDropdown(false)
    } else {
      setEditFormData({ ...editFormData, players_killed: newValue + ', ' })
      setShowPlayersDropdown(false)
    }
  }

  const startEditing = (log: WarLog) => {
    setEditingLogId(log.id)
    setEditFormData({
      log_type: log.log_type,
      hoovers_involved: log.hoovers_involved.join(', '),
      players_killed: log.players_killed.join(', '),
      notes: log.notes || '',
      evidence_url: log.evidence_url || ''
    })
  }

  const cancelEditing = () => {
    setEditingLogId(null)
    setEditFormData(null)
  }

  const saveEdit = async (logId: string, dateTime: string) => {
    if (!editFormData) return

    try {
      const hooversArray = editFormData.hoovers_involved.split(',').map(n => n.trim()).filter(n => n)
      const playersArray = editFormData.players_killed.split(',').map(n => n.trim()).filter(n => n)

      const res = await fetch(`/api/wars/${params.id}/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: dateTime,
          log_type: editFormData.log_type,
          hoovers_involved: hooversArray,
          players_killed: playersArray,
          notes: editFormData.notes || null,
          evidence_url: editFormData.evidence_url || null,
        }),
      })

      if (res.ok) {
        cancelEditing()
        fetchWarDetails()
      } else {
        alert('Failed to update log')
      }
    } catch (error) {
      console.error('Error updating log:', error)
      alert('Failed to update log')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Loading war details...</p>
        </div>
      </div>
    )
  }

  if (!war) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <p className="text-gray-400">War not found</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <button
        onClick={() => router.push('/wars')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wars
      </button>

      <Card variant="elevated" className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Swords className="w-8 h-8 text-gang-highlight" />
              <h1 className="text-3xl font-bold text-white">{war.enemy_faction}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  war.status === 'ACTIVE'
                    ? 'bg-gang-highlight/20 text-gang-highlight'
                    : 'bg-gray-600/20 text-gray-400'
                }`}
              >
                {war.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Started: {new Date(war.started_at).toLocaleString()}</span>
              {war.ended_at && (
                <span className="ml-4">
                  Ended: {new Date(war.ended_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {session && war.status === 'ACTIVE' && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Log
            </Button>
          )}
        </div>
      </Card>


      {/* War Regulations and PK List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {war.regulations && (
          <WarRegulations warType={war.war_type} regulations={war.regulations} />
        )}
        <PlayerKillList warId={params.id as string} enemyFaction={war.enemy_faction} />
      </div>

      {/* War Logs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Encounter Logs</h2>
      </div>

      {logs.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400 mb-4">No encounter logs yet</p>
          {session && war.status === 'ACTIVE' && (
            <Button onClick={() => setShowAddModal(true)}>Add First Log</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} variant="elevated">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      log.log_type === 'ATTACK' 
                        ? 'bg-gang-highlight/20 text-gang-highlight border border-gang-highlight/30' 
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {log.log_type === 'ATTACK' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">
                      {new Date(log.date_time).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    <span 
                      className="hover:text-white cursor-help transition-colors" 
                      title={`Created on ${new Date(log.created_at).toLocaleString()}`}
                    >
                      Created by {log.submitted_by_user.username}
                    </span>
                    {log.edited_by && log.edited_by_user && (
                      <>
                        {', '}
                        <span 
                          className="hover:text-white cursor-help transition-colors" 
                          title={`Edited on ${new Date(log.edited_at!).toLocaleString()}`}
                        >
                          edited by {log.edited_by_user.username}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editingLogId === log.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(log.id, log.date_time)}
                        className="px-3 py-1 bg-gang-highlight text-white rounded text-sm hover:bg-gang-highlight/80 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                      {canDeleteLog(log) && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 hover:bg-orange-500/20 rounded transition-colors"
                          title="Delete log (Admin only)"
                        >
                          <Trash2 className="w-4 h-4 text-orange-400" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {canEditLog(log) && (
                        <button
                          onClick={() => startEditing(log)}
                          className="p-2 hover:bg-gang-highlight/20 rounded transition-colors"
                          title="Edit log"
                        >
                          <Edit2 className="w-4 h-4 text-gang-highlight" />
                        </button>
                      )}
                      {canDeleteLog(log) && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 hover:bg-orange-500/20 rounded transition-colors"
                          title="Delete log (Admin only)"
                        >
                          <Trash2 className="w-4 h-4 text-orange-400" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">
                    Players Killed (83 Hoover)
                  </h4>
                  {editingLogId === log.id && editFormData ? (
                    <>
                      <input
                        type="text"
                        value={editFormData.hoovers_involved}
                        onChange={(e) => handleHooversChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowHooversDropdown(false), 200)}
                        className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm"
                        placeholder="Start typing to see Discord suggestions..."
                      />
                      {showHooversDropdown && (() => {
                        const words = editFormData.hoovers_involved.split(',')
                        const lastWord = words[words.length - 1].trim()
                        const suggestions = getFilteredMembers(lastWord)
                        return suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {suggestions.map((member: any) => {
                              const serverName = member.nickname || member.username
                              const showUsername = member.nickname && member.username !== member.nickname
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => insertSuggestion('hoovers', serverName)}
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
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {log.hoovers_involved.map((member, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gang-accent/30 rounded-full text-sm text-white"
                        >
                          {member}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">
                    Players Killed (Enemy)
                  </h4>
                  {editingLogId === log.id && editFormData ? (
                    <>
                      <input
                        type="text"
                        value={editFormData.players_killed}
                        onChange={(e) => handlePlayersChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowPlayersDropdown(false), 200)}
                        className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm"
                        placeholder="Start typing to see Discord suggestions..."
                      />
                      {showPlayersDropdown && (() => {
                        const words = editFormData.players_killed.split(',')
                        const lastWord = words[words.length - 1].trim()
                        const suggestions = getFilteredMembers(lastWord)
                        return suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-gang-primary border border-gang-accent/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {suggestions.map((member: any) => {
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
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {log.players_killed.map((player, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gang-highlight/20 rounded-full text-sm text-gang-highlight"
                        >
                          {player}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {(editingLogId === log.id || log.notes) && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Notes</h4>
                  {editingLogId === log.id && editFormData ? (
                    <textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm min-h-[80px]"
                      placeholder="Additional details..."
                    />
                  ) : (
                    <p className="text-white text-sm">{log.notes}</p>
                  )}
                </div>
              )}

              {(editingLogId === log.id || log.evidence_url) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Evidence URL
                  </h4>
                  {editingLogId === log.id && editFormData ? (
                    <input
                      type="url"
                      value={editFormData.evidence_url}
                      onChange={(e) => setEditFormData({ ...editFormData, evidence_url: e.target.value })}
                      className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm"
                      placeholder="https://..."
                    />
                  ) : log.evidence_url ? (
                    <Image 
                      src={log.evidence_url} 
                      alt="Evidence"
                      width={800}
                      height={450}
                      className="rounded-lg max-w-full h-auto max-h-96 object-contain"
                    />
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Log Modal */}
      {showAddModal && (
        <AddWarLogModal
          warId={params.id as string}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchWarDetails()
          }}
        />
      )}

    </div>
  )
}
