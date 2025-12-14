// This file is deprecated - authentication is now handled by Supabase Auth
// See lib/supabase/middleware.ts for the new authentication system
// Keep this file for backward compatibility with existing NextAuth routes

import { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import DiscordProvider from 'next-auth/providers/discord'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Using Database type from @/types/supabase for type safety

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify',
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
    async jwt({ token, account, profile }: { token: JWT; account?: any; profile?: any }) {
      if (account && profile) {
        token.discordId = profile.id as string
        token.username = profile.username as string
        token.avatar = profile.avatar as string
        token.discriminator = profile.discriminator as string
        token.email = profile.email as string
      }
      if (token.discordId && !token.role) {
        try {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('discord_id', token.discordId)
            .single<{ role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST' }>();
          
          if (error) throw error;
          token.role = user?.role || 'MEMBER';
        } catch {
          token.role = 'MEMBER';
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

        // Prefer a real Discord avatar if present; otherwise fall back to default embed avatar.
        if (token.discordId && token.avatar) {
          session.user.image = `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png?size=128`
        } else {
          const disc = Number(token.discriminator)
          const index = Number.isFinite(disc) ? disc % 5 : 0
          session.user.image = `https://cdn.discordapp.com/embed/avatars/${index}.png`
        }
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
