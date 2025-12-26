'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface MediaViewerProps {
  src: string | string[] | null
  open: boolean
  onClose: () => void
  initialIndex?: number
  className?: string
}

const getVideoThumbnail = (videoUrl: string) => {
  try {
    const url = new URL(videoUrl)
    const thumbParam = url.searchParams.get('thumb') || url.searchParams.get('thumbnail')
    if (thumbParam) return thumbParam
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
    }
    
    if (videoUrl.includes('streamable.com/')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0]
      return videoId ? `https://cdn-cf-east.streamable.com/image/${videoId}.jpg` : ''
    }
  } catch (e) {
    console.error('Error generating thumbnail URL:', e)
  }
  return ''
}

const getEmbedUrl = (url: string): string | null => {
  try {
    // Handle YouTube URLs
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0` : null
    }
    
    // Handle Streamable URLs
    if (url.includes('streamable.com')) {
      const videoId = url.split('/').pop()?.split('?')[0]
      return videoId ? `https://streamable.com/e/${videoId}?autoplay=1` : null
    }
    
    // Handle Vimeo URLs
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop()?.split('?')[0]
      return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null
    }
    
    return null
  } catch (e) {
    console.error('Error generating embed URL:', e)
    return null
  }
}

const isEmbeddableVideo = (url: string) => {
  return url.includes('youtube.com') || 
         url.includes('youtu.be') || 
         url.includes('streamable.com') || 
         url.includes('vimeo.com')
}

const isVideoUrl = (url: string) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov']
  return (
    videoExtensions.some(ext => url.toLowerCase().endsWith(ext)) ||
    isEmbeddableVideo(url)
  )
}

export function MediaViewer({ src, open, onClose, initialIndex = 0, className = '' }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const mediaArray = useMemo(() => {
    if (!src) return []
    return Array.isArray(src) ? src : [src]
  }, [src])

  const currentMedia = mediaArray[currentIndex] || null
  const isVideo = currentMedia ? isVideoUrl(currentMedia) : false
  const videoThumbnail = isVideo && currentMedia ? getVideoThumbnail(currentMedia) : null
  const hasNext = currentIndex < mediaArray.length - 1
  const hasPrevious = currentIndex > 0

  const handleNext = useCallback(() => {
    if (hasNext) {
      // Pause and reset current video if playing
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        videoRef.current.load()
      }
      setCurrentIndex(prev => prev + 1)
      setIsVideoPlaying(false)
    }
  }, [hasNext])

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      // Pause and reset current video if playing
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        videoRef.current.load()
      }
      setCurrentIndex(prev => prev - 1)
      setIsVideoPlaying(false)
    }
  }, [hasPrevious])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement
    const error = video.error
    let errorMessage = 'Failed to load video'
    
    if (error) {
      switch(error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback was aborted'
          break
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'A network error occurred while loading the video'
          break
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Error decoding the video'
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'The video format is not supported'
          break
        default:
          errorMessage = 'An unknown error occurred'
      }
    }
    
    console.error('Video error:', {
      error,
      currentSrc: video.currentSrc,
      networkState: video.networkState,
      readyState: video.readyState,
      errorMessage
    })
    
    setVideoError(errorMessage)
    setIsVideoPlaying(false)
  }, [])

  const handleVideoPlay = useCallback(async () => {
    try {
      if (videoRef.current) {
        setVideoError(null)
        await videoRef.current.play()
        setIsVideoPlaying(true)
      }
    } catch (err) {
      console.error('Error playing video:', err)
      setVideoError('Playback failed. The video may be corrupted or in an unsupported format.')
      setIsVideoPlaying(false)
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext()
    } else if (e.key === 'ArrowLeft' && hasPrevious) {
      handlePrevious()
    } else if (e.key === 'f') {
      toggleFullscreen()
    }
  }, [onClose, hasNext, hasPrevious, handleNext, handlePrevious, toggleFullscreen])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [open, handleKeyDown])

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, open])

  if (!open || !currentMedia) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - handles click outside */}
      <div 
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Main content container */}
      <div 
        ref={containerRef}
        className={`relative z-10 w-full h-auto max-w-[90vw] max-h-[90vh] flex items-center justify-center ${className}`}
        onClick={(e) => e.stopPropagation()}
       >
        {/* Navigation Counter */}
        {mediaArray.length > 1 && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm z-20">
            {currentIndex + 1} / {mediaArray.length}
          </div>
        )}

        {/* Previous Button */}
        {hasPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevious()
            }}
            className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20"
            aria-label="Previous media"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Content */}
        <div 
          className="relative w-full max-h-[80vh] flex items-center justify-center p-4 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            isEmbeddableVideo(currentMedia) ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-[800px] aspect-video">
                  <iframe
                      src={getEmbedUrl(currentMedia) || undefined}
                      className="w-full h-full rounded-lg shadow-lg"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      key={`embed-${currentMedia}`}
                      />
                </div>
              </div>
            ) : (
              <div className="relative">
                {!isVideoPlaying && videoThumbnail && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={videoThumbnail}
                      alt="Video thumbnail"
                      className="max-w-full max-h-[80vh] object-contain opacity-70"
                    />
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          if (videoRef.current) {
                            await videoRef.current.play()
                            setIsVideoPlaying(true)
                          }
                        } catch (err) {
                          console.error('Error playing video:', err)
                          setIsVideoPlaying(false)
                        }
                      }}
                      className="absolute inset-0 flex items-center justify-center w-full h-full"
                      aria-label="Play video"
                    >
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </button>
                  </div>
                )}
                <video
                  ref={videoRef}
                  src={currentMedia}
                  controls
                  autoPlay
                  className="max-w-full max-h-[90vh]"
                  onPlay={handleVideoPlay}
                  onEnded={() => setIsVideoPlaying(false)}
                  onError={handleVideoError}
                  onCanPlay={() => {
                    console.log('Video can play')
                    setVideoError(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  preload="auto"
                  playsInline
                  key={currentMedia}
                />
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center">
                    <div className="text-red-400 mb-2">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium">Could not play video</p>
                    <p className="text-sm opacity-80 mt-1">{videoError}</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <img
              src={currentMedia}
              alt=""
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* Next Button */}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20"
            aria-label="Next media"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Controls */}
        <div className="fixed top-4 right-4 flex gap-2 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              toggleFullscreen()
            }}
            className="text-white hover:bg-black/50"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-white hover:bg-black/50"
            aria-label="Close media viewer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}