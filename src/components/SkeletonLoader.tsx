import type React from "react"

interface SkeletonLoaderProps {
  type?: "novel" | "poem" | "profile"
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = "novel" }) => {
  if (type === "novel" || type === "poem") {
    const isPoemStyle = type === "poem"
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-gray-700 rounded w-64 mb-6"></div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cover Image Skeleton */}
          <div className="lg:col-span-1">
            <div className={`w-full aspect-[2/3] ${isPoemStyle ? 'bg-gradient-to-br from-rose-900/20 to-pink-900/20' : 'bg-gray-700'} rounded-lg`}></div>
          </div>

          {/* Details Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="space-y-3">
              <div className="h-8 bg-gray-700 rounded w-3/4"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              <div className="h-8 bg-gray-700 rounded w-20"></div>
              <div className="h-8 bg-gray-700 rounded w-24"></div>
              <div className="h-8 bg-gray-700 rounded w-16"></div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="h-6 bg-gray-700 rounded w-24"></div>
              <div className="h-6 bg-gray-700 rounded w-24"></div>
              <div className="h-6 bg-gray-700 rounded w-24"></div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <div className="h-12 bg-gray-700 rounded w-32"></div>
              <div className="h-12 bg-gray-700 rounded w-32"></div>
              <div className="h-12 bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>

        {/* Comments Section Skeleton */}
        <div className="mt-12 space-y-6">
          <div className="h-6 bg-gray-700 rounded w-48"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-2 ml-13">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === "profile") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-700 rounded w-48"></div>
              <div className="h-4 bg-gray-700 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[2/3] bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default SkeletonLoader

