import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const guildId = process.env.DISCORD_GUILD_ID
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!guildId || !botToken) {
      return NextResponse.json({ 
        error: 'Discord configuration missing',
        message: 'DISCORD_GUILD_ID or DISCORD_BOT_TOKEN not set'
      }, { status: 500 })
    }

    // Fetch guild roles from Discord API
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
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
        error: 'Failed to fetch Discord roles',
        details: error
      }, { status: response.status })
    }

    const roles = await response.json()

    // Format roles data for response
    const formattedRoles = roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      permissions: role.permissions,
      mentionable: role.mentionable,
      hoist: role.hoist
    }))

    return NextResponse.json({
      roles: formattedRoles,
      count: formattedRoles.length,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
