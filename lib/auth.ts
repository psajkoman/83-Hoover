// This file is deprecated - authentication is now handled by Supabase Auth
// See lib/supabase/middleware.ts for the new authentication system
// Keep this file for backward compatibility with existing NextAuth routes

import { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import DiscordProvider from 'next-auth/providers/discord'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { headers } from 'next/headers'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify' } },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, profile }: { token: JWT; account?: any; profile?: any }) {
      if (account && profile) {
        token.discordId = profile.id as string
        token.username = profile.username as string
        token.avatar = profile.avatar as string
        token.discriminator = profile.discriminator as string
        token.email = profile.email as string
      }

      // Fetch role from Supabase if not already set
      if (token.discordId && !token.role) {
        try {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('discord_id', token.discordId)
            .single<{ role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST' }>()
          
          if (!error) token.role = user?.role || 'MEMBER'
          else token.role = 'MEMBER'
        } catch {
          token.role = 'MEMBER'
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.discordId = token.discordId as string | undefined
        session.user.username = token.username as string | undefined
        session.user.discriminator = token.discriminator as string | undefined
        session.user.avatar = token.avatar as string | undefined
        session.user.role = token.role

        // Avatar URL: use Discord avatar if present, otherwise default embed
        session.user.image = token.discordId && token.avatar
          ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${Number(token.discriminator) % 5 || 0}.png`
      }
      return session
    },

    async signIn({ user, account, profile }): Promise<boolean> {
      if (account?.provider !== 'discord' || !profile) return true

      try {
        console.log('Discord sign-in:', profile.id, profile.username)

        const userAgent = headers().get('user-agent') || 'unknown'

        // Fetch display name from your Supabase users table
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('username, display_name')
          .eq('discord_id', profile.id as string)
          .single()

        const displayName = userData?.display_name || userData?.username || profile.username

        if (userError) {
          console.error('Error fetching user data:', userError)
        }

        // Insert login history
        const { error: insertError } = await supabaseAdmin
          .from('login_history')
          .insert({
            discord_id: profile.id,
            username: displayName,
            user_agent: userAgent,
            login_time: new Date().toISOString()
          })

        if (insertError) console.error('Error inserting login history:', insertError)
      } catch (error) {
        console.error('Error in signIn callback:', error)
      }

      return true
    }
  },
}
