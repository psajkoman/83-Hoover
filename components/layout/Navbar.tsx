'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Image as ImageIcon, Shield, Menu, X, LogOut, User, Swords } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Button from '../ui/Button'
import Image from 'next/image'
import { useGuild } from '@/hooks/useGuild'

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { iconUrl: guildIconUrl, name: guildName } = useGuild();
  const [displayName, setDisplayName] = useState<string | null>(null)

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/wars', label: 'Wars', icon: Swords },
    { href: '/turf', label: 'Turf Map', icon: Map },
    { href: '/roster', label: 'Roster', icon: User },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  ]

  const isAdmin = session?.user?.role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(session.user.role)


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
    <nav className="bg-gang-secondary/95 backdrop-blur-md border-b border-gang-accent/30 sticky top-0 z-50 shadow-lg transition-shadow duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Title - Always visible */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gang-highlight rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {guildIconUrl ? (
                  <Image 
                    src={guildIconUrl} 
                    alt="Faction Logo" 
                    width={40} 
                    height={40} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="font-bold text-white text-lg sm:text-xl">LWC</div>
                )}
              </div>
              <div className="block">
                <div className="text-white font-bold text-base sm:text-lg whitespace-nowrap">
                  {guildName || 'Low West Crew'}
                </div>
                <div className="text-gang-gold text-xs hidden sm:block">GTA World</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (!session) return null
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

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {session.user?.image ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                      <Image 
                        src={session.user.image} 
                        alt="Profile" 
                        width={24} 
                        height={24} 
                        className="w-full h-full object-cover"
                        unoptimized={session.user.image.includes('cdn.discordapp.com')}
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gang-highlight flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
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
              if (!session && item.href !== '/') return null
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
