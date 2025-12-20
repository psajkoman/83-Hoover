import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createWarSlug } from '@/lib/warSlug'
import { sendWarToDiscord } from '@/lib/discord'

type War = Database['public']['Tables']['faction_wars']['Row']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('faction_wars')
      .select(`
        *,
        war_logs:war_logs(
          date_time
        ).order('date_time', { ascending: false }),
        war_logs_count:war_logs(count)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status as any)
    }

    const { data: wars, error } = await query
    
    if (error) {
      console.error('Error fetching wars:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch wars' },
        { status: 500 }
      )
    }

    return NextResponse.json({ wars: wars || [] })
  } catch (error) {
    console.error('Error fetching wars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wars' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = supabaseAdmin as any

    // Check user role
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('discord_id', (session.user as any).discordId)
      .single()

    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { enemy_faction, war_type, war_level, regulations } = body

    // Set default values if enemy_faction is empty
    const effectiveEnemyFaction = enemy_faction?.trim() || 'Unknown Faction'
    const warStatus = enemy_faction?.trim() ? 'ACTIVE' : 'PENDING'

    const userRole = user?.role || 'MEMBER' // Default to 'MEMBER' if role is null/undefined
    const isAdmin = ['ADMIN', 'LEADER', 'MODERATOR'].includes(userRole)
    const isMember = userRole === 'MEMBER'

    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Members can only create non-lethal uncontrolled wars
    const effectiveWarType = isAdmin ? (war_type || 'UNCONTROLLED') : 'UNCONTROLLED'
    const effectiveWarLevel = isAdmin ? (war_level || 'NON_LETHAL') : 'NON_LETHAL'

    // If uncontrolled, get default regulations
    let warRegulations = regulations
    if (effectiveWarType === 'UNCONTROLLED') {
      const { data: globalRegs } = await supabase
        .from('global_war_regulations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (globalRegs) {
        warRegulations = {
          attacking_cooldown_hours: globalRegs.attacking_cooldown_hours,
          pk_cooldown_type: globalRegs.pk_cooldown_type,
          pk_cooldown_days: globalRegs.pk_cooldown_days,
          max_participants: globalRegs.max_participants,
          max_assault_rifles: globalRegs.max_assault_rifles,
          weapon_restrictions: globalRegs.weapon_restrictions,
        }
      }
    }

    const startedAt = new Date().toISOString()
    
    // If this is a pending war, don't send to Discord yet
    const skipDiscord = warStatus === 'PENDING'
    
    // Function to check if a slug already exists
    const slugExists = async (slug: string): Promise<boolean> => {
      try {
        const { data, error } = await (supabase as any)
          .from('faction_wars')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        
        if (error) throw error
        return !!data
      } catch (error) {
        console.error('Error checking if slug exists:', error)
        throw error
      }
    }

    // Function to generate a unique slug
    const generateUniqueSlug = async (baseSlug: string, counter = 0): Promise<string> => {
      const slug = counter === 0 ? baseSlug : `${baseSlug}-${counter}`
      const exists = await slugExists(slug)
      
      if (!exists) {
        return slug
      }
      
      return generateUniqueSlug(baseSlug, counter + 1)
    }
    
    // Generate the base slug and find a unique one
    const baseSlug = await createWarSlug(effectiveEnemyFaction, startedAt, 0)
    
    const uniqueSlug = await generateUniqueSlug(baseSlug)
    
    // Create the war with the unique slug
    const { data: war, error } = await (supabase as any)
      .from('faction_wars')
      .insert({
        enemy_faction: effectiveEnemyFaction,
        started_by: user?.id,
        status: warStatus,
        started_at: startedAt,
        slug: uniqueSlug,
        war_type: effectiveWarType,
        war_level: effectiveWarLevel,
        regulations: warRegulations,
        is_approved: !!enemy_faction?.trim(), // Mark as approved if faction name was provided
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }

    if (war) {
      // Only send to Discord if this is an approved war
      if (!skipDiscord) {
        try {
          const discordResult = await sendWarToDiscord({
            ...war,
            scoreboard: { kills: 0, deaths: 0 },
            siteUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL,
          })

          if (discordResult.ok && discordResult.messageId) {
            await supabase
              .from('faction_wars')
              .update({
                discord_message_id: discordResult.messageId,
                discord_channel_id: discordResult.channelId || null,
              })
              .eq('id', war.id)
          }
        } catch (error) {
          console.error('Failed to send war to Discord:', error)
          // Don't fail the request if Discord integration fails
        }
      }

      return NextResponse.json({ war }, { status: 201 })
    }

    return NextResponse.json({ war }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/wars:', error)
    
    // Handle different types of errors
    let statusCode = 500
    let errorMessage = 'Failed to create war'
    
    if (error?.code === '23505' && error?.details?.includes('idx_faction_wars_slug_unique')) {
      statusCode = 409 // Conflict
      errorMessage = 'A war with this name already exists. Please try a different name.'
    }
    
    const errorDetails = {
      code: error?.code,
      details: error?.details,
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }
    
    console.error('Error details:', JSON.stringify(errorDetails, null, 2))
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails })
      },
      { status: statusCode }
    )
  }
}

