import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// Check if Pusher is configured
const isPusherConfigured = 
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER

// Server-side Pusher instance (optional)
export const pusherServer = isPusherConfigured ? new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
}) : null

// Client-side Pusher instance (optional)
export const pusherClient = isPusherConfigured ? new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
) : null

// Event types
export const PUSHER_EVENTS = {
  NEW_POST: 'new-post',
  NEW_COMMENT: 'new-comment',
  TURF_UPDATE: 'turf-update',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
} as const

// Channels
export const PUSHER_CHANNELS = {
  FEED: 'feed',
  TURF: 'turf',
  PRESENCE: 'presence-faction',
} as const
