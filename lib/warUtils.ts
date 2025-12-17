import { Database } from '@/types/supabase'

type War = Database['public']['Tables']['faction_wars']['Row']

export interface WarWithLogs extends War {
  war_logs: Array<{
    date_time: string
  }>
}

export function isWarHot(war: WarWithLogs): boolean {
  console.log('Checking if war is hot:', war.id, war.enemy_faction)
  
  if (!war.war_logs || !Array.isArray(war.war_logs)) {
    console.log('No war logs or invalid logs format')
    return false
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtySixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000)

  console.log('Current time:', now.toISOString())
  console.log('One week ago:', oneWeekAgo.toISOString())
  console.log('36 hours ago:', thirtySixHoursAgo.toISOString())

  // Get logs from the last week
  const recentLogs = war.war_logs.filter(log => {
    if (!log.date_time) return false
    const logDate = new Date(log.date_time)
    const isRecent = logDate >= oneWeekAgo
    console.log(`Log ${log.date_time} is ${isRecent ? 'recent' : 'too old'}`)
    return isRecent
  })

  console.log(`Total logs in the last week: ${recentLogs.length}`)

  // Check if there are at least 6 encounters in the last week
  const hasEnoughEncounters = recentLogs.length >= 6
  if (!hasEnoughEncounters) {
    console.log('Not enough encounters in the last week')
    return false
  }

  // Check if there's been an encounter in the last 36 hours
  const hasRecentEncounter = recentLogs.some(log => {
    if (!log.date_time) return false
    const logDate = new Date(log.date_time)
    const isRecent = logDate >= thirtySixHoursAgo
    if (isRecent) {
      console.log(`Recent encounter found: ${log.date_time}`)
    }
    return isRecent
  })

  console.log(`Has recent encounter (last 36h): ${hasRecentEncounter}`)
  console.log(`War ${war.id} is ${hasRecentEncounter ? 'HOT' : 'not hot'}`)
  
  return hasRecentEncounter
}


// In warUtils.ts, add this new function:
export function isWarHotSimple(war: { war_logs: Array<{ date_time: string }> }): boolean {
  if (!war.war_logs || !Array.isArray(war.war_logs)) {
    return false
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtySixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000)

  // Get logs from the last week
  const recentLogs = war.war_logs.filter(log => {
    if (!log.date_time) return false
    const logDate = new Date(log.date_time)
    return logDate >= oneWeekAgo
  })

  // Check if there are at least 6 encounters in the last week
  const hasEnoughEncounters = recentLogs.length >= 6
  if (!hasEnoughEncounters) {
    return false
  }

  // Check if there's been an encounter in the last 36 hours
  const hasRecentEncounter = recentLogs.some(log => {
    if (!log.date_time) return false
    const logDate = new Date(log.date_time)
    return logDate >= thirtySixHoursAgo
  })

  return hasRecentEncounter
}