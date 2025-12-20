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

type UserData = {
  username: string;
  discriminator: string | null;
};

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
    async signIn({ user, account, profile }): Promise<boolean> {
      if (account?.provider === 'discord' && profile) {
        try {
          // Get client IP and user agent
          const headersList = headers();
          const ip = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';
          const userAgent = headersList.get('user-agent') || 'unknown';
          
          // Get the user's server display name (nickname if available, otherwise username)
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('username, display_name')
            .eq('discord_id', profile.id as string)
            .single() as { data: { username: string; display_name: string | null } | null };
          
          if (userData) {
            // Use the server display name if available, otherwise fall back to username
            const displayName = userData.display_name || userData.username;

            // Insert the login history with the server display name
            const { data, error } = await supabaseAdmin
              .from('login_history')
              .insert({
                discord_id: profile.id as string,
                username: displayName,
                user_agent: userAgent,
                login_time: new Date().toISOString()
              })
              .select();
            if (error) {
              console.error('Error inserting login history:', error);
            } else {
              console.log('Login history recorded:', data);
            }
          }
        } catch (error) {
          console.error('Error logging login:', error);
        }
      }
      return true; // Allow the sign-in to proceed
    },
  },
}
