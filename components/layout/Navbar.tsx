'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Image as ImageIcon, Shield, Menu, X, LogOut, User, Swords } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Button from '../ui/Button'
import Image from 'next/image'
import { useGuild } from '@/hooks/useGuild'
import { useApi } from '@/hooks/useApi'

export default function Navbar() {
  const pathname = usePathname()
  const { data: session, update } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { iconUrl: guildIconUrl, name: guildName, isLoading, error } = useGuild();
  const { data: userData } = useApi<{ displayName: string }>('/api/user/me', {
    enabled: !!session,
    debounceMs: 500,
  })

  const displayName = userData?.displayName || null

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/wars', label: 'Wars', icon: Swords },
    { href: '/turf', label: 'Turf Map', icon: Map },
    { href: '/roster', label: 'Roster', icon: User },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  ]

  const role = session?.user?.role
  const isAdmin = role && ['ADMIN', 'LEADER', 'MODERATOR'].includes(role)



  return (
    <nav className="bg-gang-secondary/95 backdrop-blur-md border-b border-gang-accent/30 sticky top-0 z-50 shadow-lg transition-shadow duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[68px]">
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
          <div className="hidden md:flex items-center h-full">
            <div className="flex items-center h-full space-x-0.5">
              {navItems.map((item) => {
                if (!session) return null
                if (item.adminOnly && !isAdmin) return null
                
                const Icon = item.icon
                const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center h-full px-4 mx-0.5 rounded-none transition-all duration-200 ${
                      isActive
                        ? 'text-white border-b-2 border-gang-highlight'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white border-b-2 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-gang-accent/20 pl-3 ml-2 h-10">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
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
                  className="flex items-center gap-1.5 text-sm h-8 px-2.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
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
        <div className="md:hidden border-t border-gang-accent/20 bg-gang-secondary/95 backdrop-blur-md animate-in fade-in-50">
          <div className="px-3 py-2 space-y-1">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gang-highlight/90 text-white font-medium'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            <div className="pt-2 border-t border-gang-accent/20 mt-2">
              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{session.user?.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link 
                  href="/auth/signin" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full"
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
