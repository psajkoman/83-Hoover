import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { isUuid } from '@/lib/warSlug'

interface DiscordUser {
  id: string
  username: string
  discriminator: string  // Changed to non-nullable as we'll ensure it's always a string
  avatar: string | null
  nickname?: string | null
  display_name?: string | null
  discord_id: string
  avatar_url?: string
  original_username?: string
  current_username?: string
}

// Update the PK map type to include the full Discord user object
const pkMap = new Map<string, { 
  player_name: string
  faction: 'ENEMY' | 'FRIEND'
  kill_count: number
  last_killed_at: string
  discord_user: DiscordUser | null
}>()

// Get PK list for a war (calculated from encounter logs)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore } as any)

    let warId = id
    if (!isUuid(id)) {
      const { data: warBySlug, error: warBySlugError } = await supabase
        .from('faction_wars')
        .select('id')
        .eq('slug', id)
        .single()

      if (warBySlugError) throw warBySlugError
      if (!warBySlug) {
        return NextResponse.json({ error: 'War not found' }, { status: 404 })
      }
      warId = warBySlug.id
    }

    // Fetch all war logs for this war
    const { data: logs, error } = await supabase
      .from('war_logs')
      .select('*')
      .eq('war_id', warId)
      .order('date_time', { ascending: false })

    if (error) throw error

    // Calculate PK list from logs
    const pkMap = new Map<string, { 
      player_name: string  // Original name from logs
      faction: 'ENEMY' | 'FRIEND'
      kill_count: number
      last_killed_at: string
      discord_user: {
        id: string
        username: string
        discord_id: string
        avatar: string | null
        discriminator: string
        current_username?: string  // Current Discord username (if different)
        original_username: string  // Original username from logs
        avatar_url?: string        // Full avatar URL (optional)
      } | null
    }>()

    for (const log of logs || []) {
      // Add enemy players killed (by us)
      for (const playerName of log.players_killed || []) {
        const cleanName = playerName.startsWith('@') ? playerName.substring(1) : playerName
        const key = `ENEMY:${cleanName}`
        
        if (pkMap.has(key)) {
          const entry = pkMap.get(key)!
          entry.kill_count++
          if (new Date(log.date_time) > new Date(entry.last_killed_at)) {
            entry.last_killed_at = log.date_time
          }
        } else {
          // Try to find Discord user for this player
          let discordUser = null
          
          // Only try to find Discord user if the name looks like a valid Discord username
          if (cleanName.length >= 2) { // Minimum length check to avoid too broad searches
            const { data } = await supabase
              .from('users')
              .select('id, username, discord_id, avatar, discriminator, display_name')
              .or(`username.ilike.%${cleanName}%,nickname.ilike.%${cleanName}%,display_name.ilike.%${cleanName}%`)
              .maybeSingle()
              
            if (data) {
              const avatarUrl = data.avatar 
                ? `https://cdn.discordapp.com/avatars/${data.discord_id}/${data.avatar}${data.avatar.startsWith('a_') ? '.gif' : '.png'}?size=64`
                : null;
              
              // Check if we already have a different entry for this Discord user
              const existingEntry = Array.from(pkMap.entries())
                .find(([_, e]) => e.discord_user?.discord_id === data.discord_id)
              
              discordUser = {
                id: data.discord_id,
                username: data.username,
                discord_id: data.discord_id,
                avatar: existingEntry ? existingEntry[1].discord_user?.avatar || data.avatar : data.avatar,
                discriminator: data.discriminator,
                // If we found an existing entry for this Discord user, use its original username
                current_username: existingEntry ? existingEntry[1].discord_user?.username : data.username,
                // Store the original username for reference
                original_username: cleanName,
                // Always keep the latest avatar URL
                avatar_url: avatarUrl || undefined
              }
              
              // If we found an existing entry with the same Discord ID but different name,
              // remove it to avoid duplicates
              if (existingEntry) {
                pkMap.delete(existingEntry[0])
              }
            }
          }

          // Ensure discordUser has all required fields and discriminator is not null
          const safeDiscordUser = discordUser ? {
            ...discordUser,
            discriminator: discordUser.discriminator || '0',
            discord_id: discordUser.discord_id || '',
            avatar: discordUser.avatar || null
          } : null;

          pkMap.set(key, {
            player_name: cleanName,
            faction: 'ENEMY',
            kill_count: 1,
            last_killed_at: log.date_time,
            discord_user: safeDiscordUser
          })
        }
      }

      // Add our friends involved (for all log types)
      for (const friendName of log.friends_involved || []) {
        const cleanName = friendName.startsWith('@') ? friendName.substring(1) : friendName
        const key = `FRIEND:${cleanName}`
        
        if (pkMap.has(key)) {
          const entry = pkMap.get(key)!
          entry.kill_count++
          if (new Date(log.date_time) > new Date(entry.last_killed_at)) {
            entry.last_killed_at = log.date_time
          }
        } else {
          // Find Discord user for this Friend
          let discordUser = null
          
          // Only try to find Discord user if the name looks like a valid Discord username
          if (cleanName.length >= 2) { // Minimum length check to avoid too broad searches
            const { data } = await supabase
              .from('users')
              .select('id, username, discord_id, avatar, discriminator, display_name')
              .or(`username.ilike.%${cleanName}%,nickname.ilike.%${cleanName}%,display_name.ilike.%${cleanName}%`)
              .maybeSingle()
              
            if (data) {
              const avatarUrl = data.avatar 
                ? `https://cdn.discordapp.com/avatars/${data.discord_id}/${data.avatar}${data.avatar.startsWith('a_') ? '.gif' : '.png'}?size=64`
                : undefined;
                
              discordUser = {
                id: data.discord_id,
                username: data.username,
                discord_id: data.discord_id,
                avatar: data.avatar,
                discriminator: data.discriminator,
                current_username: data.username,
                original_username: cleanName,
                avatar_url: avatarUrl
              };
            }
          }

          // Ensure discordUser has all required fields and discriminator is not null
          const safeDiscordUser = discordUser ? {
            ...discordUser,
            discriminator: discordUser.discriminator || '0',
            discord_id: discordUser.discord_id || '',
            avatar: discordUser.avatar || null
          } : null;

          pkMap.set(key, {
            player_name: cleanName,
            faction: 'FRIEND',
            kill_count: 1,
            last_killed_at: log.date_time,
            discord_user: safeDiscordUser
          })
        }
      }
    }

    // Get all unique player names from the PK map and clean them
    const allNames = Array.from(new Set(Array.from(pkMap.values()).map(e => 
      e.player_name.trim().toLowerCase()
    )))
    
    // Fetch all users and do the matching in memory for better flexibility
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('username, discord_id, avatar, discriminator, display_name')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
    
    // Create a map of all possible name variations to users
    const userMap = new Map()
    const uniqueUsers = new Map()
    
    allUsers?.forEach(user => {
      if (!user.username) return
      
      // Store the user by their Discord ID to ensure uniqueness
      if (!uniqueUsers.has(user.discord_id)) {
        uniqueUsers.set(user.discord_id, user)
        
        // Add exact username match (case insensitive)
        const usernameLower = user.username.toLowerCase()
        userMap.set(usernameLower, user)
        
        // Add username without numbers if it contains any
        const usernameNoNumbers = usernameLower.replace(/\d+/g, '').trim()
        if (usernameNoNumbers && usernameNoNumbers !== usernameLower) {
          userMap.set(usernameNoNumbers, user)
        }
      }
    })
    
    // Find matches for each name
    const matchedUsers = new Set()
    const matches = allNames.map(name => {
      // Try exact match first
      if (userMap.has(name)) {
        const user = userMap.get(name)
        matchedUsers.add(user.discord_id)
        return { name, user }
      }
      
      // Try partial match
      for (const [key, user] of userMap.entries()) {
        if (key.includes(name) || name.includes(key)) {
          matchedUsers.add(user.discord_id)
          return { name, user }
        }
      }
      
      return { name, user: null }
    })
    
    
    // Convert to the expected format for the rest of the code
    const users = Array.from(matchedUsers).map(id => 
      allUsers?.find(u => u.discord_id === id)
    ).filter(Boolean)
    
    // Log any unmatched names for debugging
    const unmatched = matches.filter(m => !m.user).map(m => m.name)
    if (unmatched.length > 0) {
      console.log('Unmatched names:', unmatched.join(', '))
    }
    
    
    // Process the PK list and match users
    const pkList = Array.from(pkMap.values()).map((entry, index) => {
      const playerName = entry.player_name.toLowerCase()
      
      
      // Try to find the user by either username, display name, or in the discord_user data
      let discordUser = Array.from(userMap.values()).find(user => {
        const usernameMatch = user.username?.toLowerCase() === playerName
        const displayNameMatch = user.display_name?.toLowerCase() === playerName
        const discordUserMatch = entry.discord_user?.original_username?.toLowerCase() === playerName
        return usernameMatch || displayNameMatch || discordUserMatch
      }) || entry.discord_user // Fall back to the existing discord_user data
      
      // If not found, try partial matching
      if (!discordUser) {
        console.log(`  - Not found in userMap, creating new user object...`)
        // Create a new user object with default values
        discordUser = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          username: entry.player_name,
          discriminator: '0',
          avatar: null,
          original_username: entry.player_name,
          current_username: entry.player_name,
          avatar_url: undefined,
          discord_id: ''
        };
      } else {
        // Ensure discriminator is never null
        discordUser = {
          ...discordUser,
          discriminator: discordUser.discriminator || '0'
        };
      }
      
      let displayName = entry.player_name
      if (discordUser) {
        displayName = discordUser.display_name || discordUser.username
      }
      entry.player_name = displayName
 
      return {
        id: `${entry.faction}-${entry.player_name}-${index}`,
        ...entry,
        discord_id: discordUser?.discord_id || null,
        discord_user: discordUser || null
      }
    })

    return NextResponse.json({ pkList })
  } catch (error) {
    console.error('Error fetching PK list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PK list' },
      { status: 500 }
    )
  }
}

// This endpoint is no longer needed as we're deriving PK list from logs
export async function POST() {
  return NextResponse.json(
    { error: 'Manual player addition is no longer supported. PK list is now derived from encounter logs.' },
    { status: 400 }
  )
}
