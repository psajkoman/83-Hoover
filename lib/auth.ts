// This file is deprecated - authentication is now handled by Supabase Auth
// See lib/supabase/middleware.ts for the new authentication system
// Keep this file for backward compatibility with existing NextAuth routes

import { NextAuthOptions, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import DiscordProvider from 'next-auth/providers/discord'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

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
    async jwt({ token, account, profile, trigger }: { 
      token: JWT; 
      account?: any; 
      profile?: any;
      trigger?: 'signIn' | 'signUp' | 'update' | undefined;
    }) {
      if (account && profile) {
        token.discordId = profile.id as string
        token.username = profile.username as string
        token.avatar = profile.avatar as string
        token.discriminator = profile.discriminator as string
        token.email = profile.email as string
      }

      if (token.discordId) {
        try {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('discord_id', token.discordId)
            .single<{ role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST' }>()
          
          if (!error && user?.role) {
            token.role = user.role
          } else {
            token.role = 'MEMBER'
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          token.role = 'MEMBER'
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        let userRole = token.role || 'MEMBER'
        
        if (token.discordId) {
          try {
            const { data: user } = await supabaseAdmin
              .from('users')
              .select('role')
              .eq('discord_id', token.discordId)
              .single()
              
            if (user?.role) {
              userRole = user.role
              token.role = userRole
            }
          } catch (error) {
            console.error('Error fetching user role in session callback:', error)
          }
        }

        session.user.discordId = token.discordId as string | undefined
        session.user.username = token.username as string | undefined
        session.user.discriminator = token.discriminator as string | undefined
        session.user.avatar = token.avatar as string | undefined
        session.user.role = userRole

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

        // Define extended user type with metadata
        type ExtendedUser = User & {
          app_metadata?: {
            provider?: string;
            provider_metadata?: {
              request_url?: string;
            };
          };
          user_metadata?: {
            request_url?: string;
          };
        };

        const extendedUser = user as ExtendedUser;

        // Get current URL from the request headers or referrer
        const requestUrl = extendedUser?.app_metadata?.provider === 'discord' ? 
          (extendedUser.app_metadata.provider_metadata?.request_url || '') :
          (extendedUser?.user_metadata?.request_url || '');

        // Check if user already has a login record
        const { data: existingRecord } = await supabaseAdmin
          .from('login_history')
          .select('id')
          .eq('discord_id', profile.id)
          .single();

        if (existingRecord) {
          // Update existing record using discord_id
          const { error: updateError } = await supabaseAdmin
            .from('login_history')
            .update({
              username: displayName,
              user_agent: userAgent,
              login_time: new Date().toISOString(),
              last_visited_url: requestUrl
            })
            .eq('discord_id', profile.id);
          
          if (updateError) console.error('Error updating login history:', updateError);
        } else {
          // Insert new record if none exists
          const { error: insertError } = await supabaseAdmin
            .from('login_history')
            .insert({
              discord_id: profile.id,
              username: displayName,
              user_agent: userAgent,
              login_time: new Date().toISOString(),
              last_visited_url: requestUrl
            });
          
          if (insertError) console.error('Error inserting login history:', insertError);
        }
      } catch (error) {
        console.error('Error in signIn callback:', error)
      }

          return true

    }
  },
}
