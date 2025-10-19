export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-gang-accent/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-gang-highlight border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    </div>
  )
}
