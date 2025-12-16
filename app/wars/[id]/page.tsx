'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Swords, Calendar, Copy, Check, Minus, Plus, ArrowLeft, Trash2, Edit2, Image as ImageIcon, X } from 'lucide-react'
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
  war_level?: string
  regulations: any
}

interface WarLog {
  id: string
  date_time: string
  log_type: string
  members_involved: string[]
  friends_involved: string[]
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

// Add this helper function before the ZoomedImageModal component
const getVideoThumbnail = (videoUrl: string) => {
  try {
    const url = new URL(videoUrl);
    // Check for thumbnail parameter
    const thumbParam = url.searchParams.get('thumb') || url.searchParams.get('thumbnail');
    if (thumbParam) return thumbParam;
    
    // Handle YouTube URLs
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    }
    
    // Handle Streamable URLs
    if (videoUrl.includes('streamable.com/')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      return videoId ? `https://cdn-cf-east.streamable.com/image/${videoId}.jpg` : '';
    }
  } catch (e) {
    console.error('Error generating thumbnail URL:', e);
  }
  return '';
};

// Track current image indices per log
const useImageIndices = () => {
  const [indices, setIndices] = useState<Record<string, number>>({});

  const setIndex = useCallback((logId: string, index: number) => {
    setIndices(prev => ({
      ...prev,
      [logId]: index
    }));
  }, []);

  const getIndex = useCallback((logId: string) => {
    return indices[logId] || 0;
  }, [indices]);

  return { indices, setIndex, getIndex };
};

// Zoomed image component
const ZoomedImageModal = ({ 
  src, 
  onClose, 
  allMedia = [],
  logId 
}: { 
  src: string | null; 
  onClose: () => void; 
  allMedia?: string[];
  logId: string;
}) => {
  const { indices, setIndex, getIndex } = useImageIndices();
  const currentIndex = getIndex(logId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  // Always use the source from allMedia if available, otherwise fall back to src
  const currentSrc = useMemo(() => {
    if (allMedia && allMedia.length > 0 && currentIndex >= 0 && currentIndex < allMedia.length) {
      return allMedia[currentIndex];
    }
    return src;
  }, [allMedia, currentIndex, src]);
  const isStreamable = currentSrc?.includes('streamable.com/');
  const streamableId = isStreamable ? currentSrc?.split('/').pop()?.split('?')[0] : null;
  const isYouTubeUrl = currentSrc?.includes('youtube.com') || currentSrc?.includes('youtu.be');
  const videoId = isYouTubeUrl ? 
    currentSrc?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] : 
    null;
  const copyToClipboard = async () => {
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };


  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const diff = touchStartX - touchEndX;
    const swipeThreshold = 50; // Minimum distance to trigger a swipe
    
    // Swipe left (next image)
    if (diff > swipeThreshold && currentIndex < allMedia.length - 1) {
      setIndex(logId, currentIndex + 1);
    }
    // Swipe right (previous image)
    else if (diff < -swipeThreshold && currentIndex > 0) {
      setIndex(logId, currentIndex - 1);
    }
    
    // Reset touch positions
    setTouchStartX(0);
    setTouchEndX(0);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentIndex < allMedia.length - 1) {
        e.preventDefault();
        setIndex(logId, currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setIndex(logId, currentIndex - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allMedia.length, onClose, logId, setIndex]);

  // Update current index when src changes
  useEffect(() => {
    if (src && allMedia.length > 0) {
      const index = allMedia.indexOf(src);
      if (index !== -1) {
        setIndex(logId, index);
      }
    }
  }, [src, allMedia, logId, setIndex]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!src) return;
    
    // Save current styles and scroll position
    const scrollY = window.scrollY;
    const body = document.body;
    const { position, top, width, height } = body.style;
    
    // Lock the body
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts or src changes to null
    return () => {
      // Restore styles
      body.style.position = position;
      body.style.top = top;
      body.style.width = width;
      body.style.overflow = 'unset';
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [src]);

  // Update current source when index changes
  useEffect(() => {
    if (allMedia && allMedia.length > 0 && currentIndex >= 0 && currentIndex < allMedia.length) {
      // Reset position and scale when media changes
      setPosition({ x: 0, y: 0 });
      setScale(1);
      
      // Force re-render of video elements by updating the source
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        const newSrc = allMedia[currentIndex];
        if (video.getAttribute('data-src') !== newSrc) {
          video.setAttribute('data-src', newSrc);
          video.src = newSrc;
          video.load();
          // Only autoplay if the video was playing before
          if (!video.paused) {
            video.play().catch(e => console.error('Error playing video:', e));
          }
        }
      });
    }
  }, [currentIndex, allMedia]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!currentSrc) {
    onClose();
    return null;
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out overflow-hidden"
      onClick={onClose}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {/* Navigation Arrows - Outside of scaled container */}
      {allMedia.length > 1 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm z-20 pointer-events-none">
          {currentIndex + 1} / {allMedia.length}
        </div>
      )}
      
      {allMedia.length > 1 && currentIndex > 0 && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIndex(logId, currentIndex - 1);
          }}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20"
          aria-label="Previous image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {allMedia.length > 1 && currentIndex < allMedia.length - 1 && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIndex(logId, currentIndex + 1);
          }}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20"
          aria-label="Next image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Scaled content container */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          touchAction: 'pan-y pinch-zoom',
          userSelect: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {isStreamable && streamableId ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-4xl aspect-video">
              <iframe
                src={`https://streamable.com/e/${streamableId}?autoplay=1`}
                title="Streamable video player"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full rounded-lg"
                key={`streamable-${currentIndex}`}
              ></iframe>
            </div>
          </div>
        ) : isYouTubeUrl && videoId ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-4xl aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-lg"
                key={`youtube-${currentIndex}`}
              ></iframe>
            </div>
          </div>
        ) : /\.(mp4|webm|mov)$/i.test(src?.split('?')[0] || '') ? (
          <video
            src={currentSrc}
            className="max-w-full max-h-[90vh] object-contain select-none"
            controls
            autoPlay
            loop
            playsInline
            key={`video-${currentIndex}`}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              // Set the current frame as the poster
              video.poster = getVideoThumbnail(currentSrc);
            }}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.poster = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiB2aWV3Qm94PSIwIDAgNDAwIDIyNSI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMjUiIGZpbGw9IiMxZDIzMmMiLz48cGF0aCBkPSJNMTUwIDc1bDEwMCA1NS43ODktMTAwIDU1Ljc4OFY3NXoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (scale === 1) {
                setScale(1.5);
              } else {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        ) : (
          <img 
            src={currentSrc} 
            alt={`Evidence ${currentIndex + 1} of ${allMedia.length || 1}`} 
            className="max-w-full max-h-[90vh] object-contain select-none"
            draggable="false"
            key={`image-${currentIndex}`}
            onClick={(e) => {
              e.stopPropagation();
              if (scale === 1) {
                setScale(1.5);
              } else {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        )}
      </div>
      {/* Keep existing buttons and controls */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
        aria-label="Close zoomed content"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      {!isYouTubeUrl && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className="absolute top-20 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10 group"
            aria-label="Copy URL"
          >
            {copied ? (
              <Check className="w-6 h-6 text-green-400" />
            ) : (
              <>
                <Copy className="w-6 h-6 text-white group-hover:text-blue-400" />
                <span className="sr-only">Copy URL</span>
              </>
            )}
          </button>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full p-1.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale(prev => Math.max(0.5, prev - 0.25));
              }}
              className="p-2 text-white hover:bg-white/20 rounded-full"
              aria-label="Zoom out"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-white text-sm w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale(prev => Math.min(3, prev + 0.25));
              }}
              className="p-2 text-white hover:bg-white/20 rounded-full"
              aria-label="Zoom in"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default function WarDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const warParam = params.id as string
  const [war, setWar] = useState<War | null>(null)
  const [logs, setLogs] = useState<WarLog[]>([])
  const [pkList, setPkList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  // State for the currently zoomed image and its associated log
  const [zoomedImage, setZoomedImage] = useState<{url: string, logId: string} | null>(null)
  const [editFormData, setEditFormData] = useState<{
    log_type: string
    members_involved: string
    friends_involved: string
    players_killed: string
    notes: string
    evidence_url: string
  } | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [discordMembers, setDiscordMembers] = useState<any[]>([])
  const [showMembersDropdown, setShowMembersDropdown] = useState(false)
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false)
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

  // Extract image URLs from text
const extractImageUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+(?:\.(?:jpg|jpeg|png|gif|webp|bmp)))(?=\s|$)/gi;
  return text.match(urlRegex) || [];
};

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

  const friendKills = pkList.filter(p => p.faction === 'FRIEND').reduce((sum, p) => sum + p.kill_count, 0)
  const enemyKills = pkList.filter(p => p.faction === 'ENEMY').reduce((sum, p) => sum + p.kill_count, 0)

  const fetchWarDetails = useCallback(async () => {
    setIsLoading(true)
    try {
      const [warRes, logsRes, pkRes] = await Promise.all([
        fetch(`/api/wars/${warParam}`),
        fetch(`/api/wars/${warParam}/logs`),
        fetch(`/api/wars/${warParam}/pk-list`),
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
  }, [warParam])

  useEffect(() => {
    fetchWarDetails()
  }, [fetchWarDetails])

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return

    try {
      const res = await fetch(`/api/wars/${warParam}/logs/${logId}`, {
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
    
    // If user is admin, they can always edit
    if (isAdmin) return true
    
    // If not admin, check if user is owner and log is within 24 hours
    if (isOwner) {
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
      const logAge = Date.now() - new Date(log.created_at).getTime()
      return logAge <= TWENTY_FOUR_HOURS
    }
    
    return false
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

  const getServerDisplayName = (discordId: string | undefined, fallback: string) => {
    if (!discordId) return fallback
    const member = discordMembers.find((m: any) => m.id === discordId)
    return member?.display_name || member?.nickname || member?.username || fallback
  }

  const handleMembersChange = (value: string) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, members_involved: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowMembersDropdown(lastWord.length >= 2)
  }

  const handleFriendsChange = (value: string) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, friends_involved: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowFriendsDropdown(lastWord.length >= 2)
  }

  const handlePlayersChange = (value: string) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, players_killed: value })
    const words = value.split(',')
    const lastWord = words[words.length - 1].trim()
    setShowPlayersDropdown(lastWord.length >= 2)
  }

  const insertSuggestion = (field: 'members' | 'friends' | 'players', suggestion: string) => {
    if (!editFormData) return
    const currentValue =
      field === 'members'
        ? editFormData.members_involved
        : field === 'friends'
          ? editFormData.friends_involved
          : editFormData.players_killed
    const words = currentValue.split(',').map(w => w.trim())
    words[words.length - 1] = suggestion
    const newValue = words.join(', ')
    
    if (field === 'members') {
      setEditFormData({ ...editFormData, members_involved: newValue + ', ' })
      setShowMembersDropdown(false)
    } else if (field === 'friends') {
      setEditFormData({ ...editFormData, friends_involved: newValue + ', ' })
      setShowFriendsDropdown(false)
    } else {
      setEditFormData({ ...editFormData, players_killed: newValue + ', ' })
      setShowPlayersDropdown(false)
    }
  }

  const startEditing = (log: WarLog) => {
    setEditingLogId(log.id)
    setEditFormData({
      log_type: log.log_type,
      members_involved: (log.members_involved || []).join(', '),
      friends_involved: log.friends_involved.join(', '),
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
      const membersArray = editFormData.members_involved.split(',').map(n => n.trim()).filter(n => n)
      const friendsArray = editFormData.friends_involved.split(',').map(n => n.trim()).filter(n => n)
      const playersArray = editFormData.players_killed.split(',').map(n => n.trim()).filter(n => n)

      const res = await fetch(`/api/wars/${warParam}/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: dateTime,
          log_type: editFormData.log_type,
          members_involved: membersArray,
          friends_involved: friendsArray,
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

  const getWarLevelLabel = (level?: string) => {
    return level === 'LETHAL' ? 'Lethal' : 'Non-lethal'
  }

  const getWarLevelClasses = (level?: string) => {
    return level === 'LETHAL'
      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      : 'bg-gang-green/20 text-gang-green border border-gang-green/30'
  }

  const handleImageClick = (url: string, logId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomedImage({url, logId});
  };

  const renderMedia = (url: string, logId: string, className = '') => {
    if (!url) return null;
    
    const isVideo = /(\.(mp4|webm|mov)|youtube\.com|youtu\.be|streamable\.com)/i.test(url);
    
    if (isVideo) {
      const thumbnail = getVideoThumbnail(url);
      return (
        <div 
          className={`relative cursor-pointer group ${className}`}
          onClick={(e) => handleImageClick(url, logId, e)}
        >
          <img 
            src={thumbnail} 
            alt="Video thumbnail"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
            <div className="bg-black/60 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                <path d="M15 3h6v6"></path>
                <path d="M21 3l-7 7"></path>
                <path d="M9 3H3v6"></path>
                <path d="M3 3l7 7"></path>
              </svg>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={(e) => handleImageClick(url, logId, e)}
      >
        <img 
          src={url} 
          alt="Evidence"
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
          <div className="bg-black/60 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
              <path d="M15 3h6v6"></path>
              <path d="M21 3l-7 7"></path>
              <path d="M9 3H3v6"></path>
              <path d="M3 3l7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  };

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
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getWarLevelClasses(war.war_level)}`}>
                {getWarLevelLabel(war.war_level)}
              </span>
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
        <PlayerKillList warId={warParam} enemyFaction={war.enemy_faction} />
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
                      Created by {getServerDisplayName(log.submitted_by_user?.discord_id, log.submitted_by_user?.username)}
                    </span>
                    {log.edited_by && log.edited_by_user && (
                      <>
                        {', '}
                        <span 
                          className="hover:text-white cursor-help transition-colors" 
                          title={`Edited on ${new Date(log.edited_at!).toLocaleString()}`}
                        >
                          edited by {getServerDisplayName(log.edited_by_user?.discord_id, log.edited_by_user?.username)}
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
              {/* Members Involved */}
              <div className="relative">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Members Involved (Low West Crew)
                </h4>
                {editingLogId === log.id && editFormData ? (
                  <>
                    <input
                      type="text"
                      value={editFormData.members_involved}
                      onChange={(e) => handleMembersChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowMembersDropdown(false), 200)}
                      className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm"
                      placeholder="Start typing to see Discord suggestions..."
                    />
                    {showMembersDropdown && (() => {
                      const words = editFormData.members_involved.split(',')
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
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {log.members_involved?.map((member, idx) => (
                      <span
                        key={`member-${idx}`}
                        className="px-3 py-1.5 bg-blue-500/20 rounded-full text-sm text-blue-300"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">
                    Players Killed (Low West Crew)
                  </h4>
                  {editingLogId === log.id && editFormData ? (
                    <>
                      <input
                        type="text"
                        value={editFormData.friends_involved}
                        onChange={(e) => handleFriendsChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowFriendsDropdown(false), 200)}
                        className="w-full px-3 py-2 bg-gang-primary/50 border border-gang-accent/30 rounded text-white text-sm"
                        placeholder="Start typing to see Discord suggestions..."
                      />
                      {showFriendsDropdown && (() => {
                        const words = editFormData.friends_involved.split(',')
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
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {log.friends_involved.map((member, idx) => (
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
                    <div className="space-y-2">
                      <p className="text-white text-sm whitespace-pre-line">{log.notes?.replace(/https?:\/\/[^\s]+(\.[^\s]+)+/g, '')}</p>
                      {log.notes && extractImageUrls(log.notes).map((url, idx) => (
                        <div key={idx} className="mt-2">
                          {renderMedia(url, log.id, 'max-h-40')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(editingLogId === log.id || log.evidence_url) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Evidence
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {log.evidence_url.split(',').map((url, index) => {
                        const trimmedUrl = url.trim();
                        const urlWithoutParams = trimmedUrl.split('?')[0];
                        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlWithoutParams);
                        const isStreamable = trimmedUrl.includes('streamable.com/');
                        const streamableId = isStreamable ? trimmedUrl.split('/').pop()?.split('?')[0] : null;                        
                        const isYouTube = trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be');
                        const isVideo = /\.(mp4|webm|mov)$/i.test(urlWithoutParams);
                        const videoId = isYouTube ? 
                          trimmedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] : 
                          null;
                        if (isStreamable && streamableId) {
                          return (
                            <div key={index} className="relative group">
                              <div 
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({url: trimmedUrl, logId: log.id});
                                }}
                              >
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                  <img
                                    src={`https://cdn-cf-east.streamable.com/image/${streamableId}.jpg`}
                                    alt="Streamable video"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to a placeholder if the thumbnail fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiB2aWV3Qm94PSIwIDAgNDAwIDIyNSI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMjUiIGZpbGw9IiMxZDIzMmMiLz48cGF0aCBkPSJNMTUwIDc1bDEwMCA1NS43ODktMTAwIDU1Ljc4OFY3NXoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <div className="bg-black/60 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                                      <path d="M15 3h6v6"></path>
                                      <path d="M21 3l-7 7"></path>
                                      <path d="M9 3H3v6"></path>
                                      <path d="M3 3l7 7"></path>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (isVideo) {
                          return (
                            <div key={index} className="relative group">
                              <div 
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({url: trimmedUrl, logId: log.id});
                                }}
                              >
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                  <video
                                    src={trimmedUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                    // Add this line to show the first frame as thumbnail
                                    onLoadedData={(e) => {
                                      const video = e.target as HTMLVideoElement;
                                      // Create a canvas to capture the first frame
                                      const canvas = document.createElement('canvas');
                                      canvas.width = video.videoWidth;
                                      canvas.height = video.videoHeight;
                                      const ctx = canvas.getContext('2d');
                                      if (ctx) {
                                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                        // Set the first frame as the poster
                                        video.poster = canvas.toDataURL('image/jpeg');
                                      }
                                    }}
                                    // Fallback to a play button if the video fails to load
                                    onError={(e) => {
                                      const target =e.target as HTMLVideoElement;
                                      target.poster = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiB2aWV3Qm94PSIwIDAgNDAwIDIyNSI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMjUiIGZpbGw9IiMxZDIzMmMiLz48cGF0aCBkPSJNMTUwIDc1bDEwMCA1NS43ODktMTAwIDU1Ljc4OFY3NXoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <div className="bg-black/60 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                                      <path d="M15 3h6v6"></path>
                                      <path d="M21 3l-7 7"></path>
                                      <path d="M9 3H3v6"></path>
                                      <path d="M3 3l7 7"></path>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (isYouTube && videoId) {
                          return (
                            <div key={index} className="relative group">
                              <div 
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({url: trimmedUrl, logId: log.id});
                                }}
                              >
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                  <img
                                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                    alt="YouTube thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <div className="bg-black/60 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                                      <path d="M15 3h6v6"></path>
                                      <path d="M21 3l-7 7"></path>
                                      <path d="M9 3H3v6"></path>
                                      <path d="M3 3l7 7"></path>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (!isImage) {
                          return (
                            <div 
                              className="relative group p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomedImage({url: trimmedUrl, logId: log.id});
                              }}
                            >
                              <a 
                                href={trimmedUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline break-all pr-6"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {trimmedUrl}
                              </a>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                  <path d="M15 3h6v6"></path>
                                  <path d="M21 3l-7 7"></path>
                                  <path d="M9 3H3v6"></path>
                                  <path d="M3 3l7 7"></path>
                                </svg>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={index} className="relative group">
                            <div 
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomedImage({url: trimmedUrl, logId: log.id});
                              }}
                            >
                              <Image 
                                src={trimmedUrl}
                                alt={`Evidence ${index + 1}`}
                                width={800}
                                height={450}
                                className="rounded-lg w-full h-auto aspect-video object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <div className="bg-black/60 p-2 rounded-full">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                                    <path d="M15 3h6v6"></path>
                                    <path d="M21 3l-7 7"></path>
                                    <path d="M9 3H3v6"></path>
                                    <path d="M3 3l7 7"></path>
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Log Modal */}
      {/* Zoomed Image Modal */}
      {zoomedImage && (
          <ZoomedImageModal 
            src={zoomedImage.url} 
            onClose={() => setZoomedImage(null)}
            allMedia={(function() {
              // Only get media from the specific log that was clicked
              const currentLog = logs.find(log => log.id === zoomedImage.logId);
              if (!currentLog) return [];
              
              const media: string[] = [];
              
              // Add evidence_url if it exists
              if (currentLog.evidence_url) {
                // Split by comma in case there are multiple URLs
                const urls = currentLog.evidence_url.split(',').map(url => url.trim()).filter(Boolean);
                media.push(...urls);
              }
              
              // Add any image URLs from notes
              if (currentLog.notes) {
                media.push(...extractImageUrls(currentLog.notes));
              }
              
              return media;
            })()}
            logId={zoomedImage.logId}
          />
        )}

      {showAddModal && (
        <AddWarLogModal
          warId={warParam}
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
