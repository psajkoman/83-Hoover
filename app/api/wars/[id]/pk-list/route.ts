import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  nickname?: string | null
  display_name?: string | null
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

    // Fetch all war logs for this war
    const { data: logs, error } = await supabase
      .from('war_logs')
      .select('*')
      .eq('war_id', id)
      .order('date_time', { ascending: false })

    if (error) throw error

    // Calculate PK list from logs
    const pkMap = new Map<string, { 
      player_name: string
      faction: 'ENEMY' | 'FRIEND'
      kill_count: number
      last_killed_at: string
      discord_user: {
        username: string
        discord_id: string
        avatar: string | null
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
              .select('id, username, discord_id, avatar, discriminator')
              .or(`username.ilike.%${cleanName}%,nickname.ilike.%${cleanName}%`)
              .maybeSingle()
            discordUser = data || null
          }

          pkMap.set(key, {
            player_name: cleanName,
            faction: 'ENEMY',
            kill_count: 1,
            last_killed_at: log.date_time,
            discord_user: discordUser
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
              .select('id, username, discord_id, avatar, discriminator')
              .or(`username.ilike.%${cleanName}%,nickname.ilike.%${cleanName}%`)
              .maybeSingle()
            discordUser = data || null
          }

          pkMap.set(key, {
            player_name: cleanName,
            faction: 'FRIEND',
            kill_count: 1,
            last_killed_at: log.date_time,
            discord_user: discordUser
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
    
    console.log('Matched users:', matches.filter(m => m.user).length, 'out of', allNames.length)
    
    // Convert to the expected format for the rest of the code
    const users = Array.from(matchedUsers).map(id => 
      allUsers?.find(u => u.discord_id === id)
    ).filter(Boolean)
    
    console.log('Matched users:', users.length, 'out of', allNames.length)
    console.log('Fetched users from Supabase:', users.length)
    
    // Log any unmatched names for debugging
    const unmatched = matches.filter(m => !m.user).map(m => m.name)
    if (unmatched.length > 0) {
      console.log('Unmatched names:', unmatched.join(', '))
    }
    
    // Reuse the existing userMap that was created earlier
    // No need to recreate it as we already have all the mappings we need
    console.log('User map size:', userMap.size)
    
    // Process the PK list and match users
    const pkList = Array.from(pkMap.values()).map((entry, index) => {
      const playerName = entry.player_name.toLowerCase()
      
      // Debug logging
      console.log(`Processing player: ${entry.player_name} (${entry.faction})`)
      
      // Try to find the user by either username or display name (nickname)
      let discordUser = Array.from(userMap.values()).find(user => {
        const usernameMatch = user.username?.toLowerCase() === playerName
        const displayNameMatch = user.display_name?.toLowerCase() === playerName
        return usernameMatch || displayNameMatch
      })
      
      // If not found, try partial matching
      if (!discordUser) {
        console.log(`  - Not found in userMap, trying partial match...`)
        // Get all users from the map and try partial matching
        discordUser = Array.from(userMap.values()).find(user => {
          const usernamePartial = user.username?.toLowerCase().includes(playerName)
          const displayNamePartial = user.display_name?.toLowerCase().includes(playerName)
          return usernamePartial || displayNamePartial
        })
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
