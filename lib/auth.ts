// This file is deprecated - authentication is now handled by Supabase Auth
// See lib/supabase/middleware.ts for the new authentication system
// Keep this file for backward compatibility with existing NextAuth routes

import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

export const authOptions: NextAuthOptions = {
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
  },
}
