import { Database } from '@/types/supabase'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type UserRole = Database['public']['Tables']['users']['Row']['role']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const discordId = (session.user as any).discordId
    if (!discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const guildId = process.env.DISCORD_GUILD_ID
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!guildId || !botToken) {
      return NextResponse.json({ 
        error: 'Discord configuration missing',
        message: 'DISCORD_GUILD_ID or DISCORD_BOT_TOKEN not set'
      }, { status: 500 })
    }

    // Fetch guild members from Discord API
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Discord API error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch Discord members',
        details: error
      }, { status: response.status })
    }

    const members = await response.json()

    // Sync members with database, prioritizing server nicknames
    const { data: syncedMembers, error: syncError } = await supabaseAdmin
      .from('users')
      .upsert(
        members
          .filter((member: any) => !member.user.bot) // Don't sync bot users
          .map((member: any) => {
            // Use server nickname if available, otherwise fall back to username
            const displayName = member.nick || member.user.username;
            
            return {
              discord_id: member.user.id,
              username: member.user.username, // Keep original username
              display_name: member.nick || null,      // Add display_name field for nicknames
              discriminator: member.user.discriminator || null,
              avatar: member.user.avatar,
              role: member.roles.includes(process.env.DISCORD_ADMIN_ROLE || '') ? 'ADMIN' : 'MEMBER',
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }),
        {
          onConflict: 'discord_id',
          ignoreDuplicates: false,
        }
      )
      .select()

    if (syncError) {
      console.error('Error syncing members with database:', syncError)
    } else {
      console.log(`Synced ${syncedMembers?.length || 0} members with database`)
    }

    // Format member data for response, prioritizing nicknames
    const formattedMembers = members
      .filter((member: any) => !member.user.bot) // Don't include bots
      .map((member: any) => {
        const displayName = member.nick || member.user.username;
        
        return {
          id: member.user.id,
          username: member.user.username, // Original username
          display_name: displayName,      // Nickname or username
          discriminator: member.user.discriminator,
          avatar: member.user.avatar,
          nickname: member.nick,          // Keep original nickname
          roles: member.roles,
          joinedAt: member.joined_at,
          bot: member.user.bot || false,
        };
      })

    return NextResponse.json({
      members: formattedMembers,
      count: formattedMembers.length,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
