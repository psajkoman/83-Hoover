import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, options?: { use24Hour?: boolean; useServerTime?: boolean }): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: !options?.use24Hour,
    timeZone: options?.useServerTime ? 'Europe/London' : undefined
  }).format(d)
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(d)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getPostTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ANNOUNCEMENT: 'bg-gang-highlight',
    SCREENSHOT: 'bg-gray-600',
    WORD_ON_STREET: 'bg-yellow-500',
    ATTACK_LOG: 'bg-orange-500',
    DEFENSE_LOG: 'bg-green-500',
    GRAFFITI: 'bg-purple-500',
    MEDIA: 'bg-pink-500',
    GENERAL: 'bg-gray-500',
  }
  return colors[type] || 'bg-gray-500'
}

export function getPostTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    ANNOUNCEMENT: '📢',
    SCREENSHOT: '📸',
    WORD_ON_STREET: '👂',
    ATTACK_LOG: '⚔️',
    DEFENSE_LOG: '🛡️',
    GRAFFITI: '🎨',
    MEDIA: '🎬',
    GENERAL: '💬',
  }
  return icons[type] || '💬'
}
