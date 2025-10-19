import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import Card from '@/components/ui/Card'
import Image from 'next/image'
import { formatRelativeTime } from '@/lib/utils'

export default async function GalleryPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  const { data: mediaPosts } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(username, avatar)
    `)
    .in('type', ['SCREENSHOT', 'MEDIA', 'GRAFFITI'])
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Media Gallery
        </h1>
        <p className="text-gray-400 text-lg">
          Screenshots, videos, and graffiti from the crew
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaPosts && mediaPosts.length > 0 ? mediaPosts.map((post: any) => (
          <Card key={post.id} className="group cursor-pointer hover:scale-105 transition-transform p-0 overflow-hidden">
            <div className="relative aspect-video">
              {post.media_urls && post.media_urls[0] && (
                <Image
                  src={post.media_urls[0]}
                  alt={post.title || 'Media'}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gang-accent flex items-center justify-center text-xs text-white font-bold">
                      {post.author?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-white text-sm font-medium">{post.author?.username || 'Unknown'}</span>
                  </div>
                  {post.title && (
                    <p className="text-white font-semibold mb-1">{post.title}</p>
                  )}
                  <p className="text-gray-300 text-xs">{formatRelativeTime(new Date(post.created_at))}</p>
                </div>
              </div>
            </div>
          </Card>
        )) : null}
      </div>

      {(!mediaPosts || mediaPosts.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No media posts yet</p>
        </div>
      )}
    </div>
  )
}
