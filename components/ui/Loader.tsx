'use client'

export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gang-highlight"></div>
    </div>
  )
}
