import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      discordId?: string
    }
  }

  interface User {
    id: string
    role?: string
    discordId?: string
  }
}
