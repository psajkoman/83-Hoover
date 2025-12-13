import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const guildId = process.env.DISCORD_GUILD_ID
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!guildId || !botToken) {
      return NextResponse.json(
        {
          error: 'Discord configuration missing',
          message: 'DISCORD_GUILD_ID or DISCORD_BOT_TOKEN not set',
        },
        { status: 500 }
      )
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Discord API error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch Discord guild',
          details: error,
        },
        { status: response.status }
      )
    }

    const guild = await response.json()

    const iconHash = guild.icon as string | null
    const isAnimated = typeof iconHash === 'string' && iconHash.startsWith('a_')
    const iconUrl = iconHash
      ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${isAnimated ? 'gif' : 'png'}?size=128`
      : null

    return NextResponse.json({
      id: guild.id,
      name: guild.name,
      iconUrl,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
