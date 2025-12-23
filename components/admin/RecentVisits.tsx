'use client'

import { useTimezone } from '@/contexts/TimezoneContext'
import Image from 'next/image'
import { useState } from 'react'

interface LoginHistoryItem {
  discord_id: string
  login_time: string
  displayName: string
  avatarUrl?: string
  last_visited_url?: string | null
  formattedTime: string
  fullDate: Date
}

export function RecentVisits({ loginHistory }: { loginHistory: LoginHistoryItem[] }) {
  const { formatDateTime } = useTimezone();
  const [showFullUrl, setShowFullUrl] = useState<string | null>(null);
  
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 -mr-1">
      {loginHistory.map((login) => {
        const isOnline = (Date.now() - new Date(login.login_time).getTime()) < 15 * 60 * 1000;
        
        return (
          <div 
            key={`${login.discord_id}-${login.login_time}`}
            className="flex items-center p-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
          >
            <div className="relative mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                {login.avatarUrl ? (
                  <Image
                    src={login.avatarUrl}
                    alt={login.displayName}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white text-xs">
                    {login.displayName?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div 
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-800 ${
                  isOnline ? 'bg-green-500' : 'bg-gray-500'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {login.displayName}
                  </div>
                  {login.last_visited_url && (
                    <div 
                      className="text-xs text-gray-400 truncate max-w-[150px] md:max-w-[250px]" 
                      title={login.last_visited_url}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setShowFullUrl(login.last_visited_url || null);
                        setTimeout(() => setShowFullUrl(null), 3000);
                      }}
                    >
                      {showFullUrl === login.last_visited_url ? (
                        <span className="break-all">{login.last_visited_url}</span>
                      ) : (
                        (() => {
                          try {
                            const url = new URL(login.last_visited_url || '');
                            const path = url.pathname;
                            const pathParts = path.split('/').filter(Boolean);
                            const displayPath = pathParts.length > 2
                              ? `.../${pathParts.slice(-2).join('/')}`
                              : path;
                            return displayPath || url.hostname;
                          } catch (e) {
                            return login.last_visited_url?.substring(0, 50) + (login.last_visited_url?.length > 50 ? '...' : '');
                          }
                        })()
                      )}
                    </div>
                  )}
                </div>
                <span 
                  className="text-xs text-gray-400 ml-2 whitespace-nowrap cursor-help flex-shrink-0"
                  title={formatDateTime(login.fullDate)}
                >
                  {login.formattedTime}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}