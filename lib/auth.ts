// This file is deprecated - authentication is now handled by Supabase Auth
// See lib/supabase/middleware.ts for the new authentication system
// Keep this file for backward compatibility with existing NextAuth routes

import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

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
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id as string
        token.username = profile.username as string
        token.avatar = profile.avatar as string
        token.discriminator = profile.discriminator as string
        token.email = profile.email as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.discordId = token.discordId as string | undefined
        session.user.username = token.username as string | undefined
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        try {
          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('discord_id', profile.id as string)
            .single()

          if (!existingUser) {
            // Create new user
            await (supabaseAdmin as any).from('users').insert({
              discord_id: profile.id as string,
              username: profile.username as string,
              discriminator: (profile.discriminator as string) || null,
              avatar: (profile.avatar as string) || null,
              email: (profile.email as string) || null,
              role: 'MEMBER',
            })
          } else {
            // Update existing user
            await (supabaseAdmin as any)
              .from('users')
              .update({
                username: profile.username as string,
                discriminator: (profile.discriminator as string) || null,
                avatar: (profile.avatar as string) || null,
                last_active: new Date().toISOString(),
              })
              .eq('discord_id', profile.id as string)
          }
        } catch (error) {
          console.error('Error creating/updating user in Supabase:', error)
          // Still allow sign in even if Supabase fails
        }
      }
      return true
    },
  },
}
