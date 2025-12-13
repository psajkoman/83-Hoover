'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Image as ImageIcon, Shield, Menu, X, LogOut, User, Swords } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Button from '../ui/Button'
import Image from 'next/image'

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [guildIconUrl, setGuildIconUrl] = useState<string | null>(null)
  const [guildName, setGuildName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/wars', label: 'Wars', icon: Swords },
    { href: '/turf', label: 'Turf Map', icon: Map },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  ]

  const isAdmin = session?.user?.role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(session.user.role)

  useEffect(() => {
    const fetchGuildIcon = async () => {
      try {
        const res = await fetch('/api/discord/guild')
        const data = await res.json()
        if (res.ok) {
          if (data?.iconUrl) setGuildIconUrl(data.iconUrl)
          if (data?.name) setGuildName(data.name)
        }
      } catch {
        // ignore
      }
    }

    fetchGuildIcon()
  }, [])

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!session) {
        setDisplayName(null)
        return
      }

      try {
        const res = await fetch('/api/user/me')
        const data = await res.json()
        if (res.ok && data?.displayName) setDisplayName(data.displayName)
      } catch {
        // ignore
      }
    }

    fetchDisplayName()
  }, [session])

  return (
    <nav className="bg-gang-secondary/90 backdrop-blur-md border-b border-gang-accent/30 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gang-highlight rounded-lg flex items-center justify-center overflow-hidden">
              {guildIconUrl ? (
                <Image src={guildIconUrl} alt="Discord server icon" width={40} height={40} />
              ) : (
                <div className="font-bold text-white text-xl">1</div>
              )}
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-bold text-lg">{guildName || 'Low West Crew'}</div>
              <div className="text-gang-gold text-xs">GTA World</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null
              
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gang-highlight text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm text-white">{displayName || session.user?.name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/auth/signin">
                <Button size="sm">Sign In with Discord</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gang-accent/30 bg-gang-secondary">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null
              
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gang-highlight text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            <div className="pt-3 border-t border-gang-accent/30 mt-3">
              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{session.user?.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block"
                >
                  <Button className="w-full">Sign In with Discord</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
