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
      username?: string
      discriminator?: string
      avatar?: string
    }
  }

  interface User {
    id: string
    role?: string
    discordId?: string
    username?: string
    discriminator?: string
    avatar?: string
    email?: string | null
  }

  interface Profile {
    id: string
    username: string
    discriminator: string
    avatar: string
    email?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string
    username?: string
    discriminator?: string
    avatar?: string
    role?: string
  }
}
