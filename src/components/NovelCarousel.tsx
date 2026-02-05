"use client"
import type React from "react"
import { Link } from "react-router-dom"
import type { Novel } from "../types/novel"
import CachedImage from "./CachedImage"

interface NovelCarouselProps {
  title: string
  novels: Novel[]
  loading: boolean
  seeAllLink: string
  imageErrors: Record<string, boolean>
  handleImageError: (novelId: string) => void
  getGenreColorClass: (genres: string[]) => string
}

const NovelCarousel: React.FC<NovelCarouselProps> = ({
  title,
  novels,
  loading,
  seeAllLink,
  imageErrors,
  handleImageError,
  getGenreColorClass,
}) => {
  const getFirebaseDownloadUrl = (url: string) => {
    if (!url || !url.includes("firebasestorage.app")) {
      return url
    }

    try {
      // Convert Firebase Storage URL to download URL format that bypasses CORS
      const urlParts = url.split("/")
      const bucketName = urlParts[3] // Extract bucket name
      const filePath = urlParts.slice(4).join("/") // Extract file path

      // Create download URL format that doesn't require CORS
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    } catch (error) {
      console.log(`[v0] Error converting Firebase URL: ${error}`)
      return url
    }
  }

  return (
    <section className="py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#E0E0E0]">{title}</h2>
        <Link to={seeAllLink} className="text-purple-400 hover:text-purple-300 transition-colors text-lg font-medium">
          See All
        </Link>
      </div>
      {loading ? (
        <div
          className="flex overflow-x-auto space-x-4 py-4 px-4 sm:px-0 scrollbar-hide"
          style={{
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE/Edge
          }}
        >
          <style>
            {`
      /* Hide scrollbar for Chrome, Safari, and Opera */
      div::-webkit-scrollbar {
        display: none;
      }
    `}
          </style>
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-40 h-64 bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse"
            >
              <div className="w-full h-full bg-gray-700"></div>
            </div>
          ))}
        </div>
      ) : novels.length > 0 ? (
        <div
          className="flex overflow-x-auto space-x-4 py-2 px-4 sm:px-0 scrollbar-hide"
          style={{
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE/Edge
          }}
        >
          <style>
            {`
      /* Hide scrollbar for Chrome, Safari, and Opera */
      div::-webkit-scrollbar {
        display: none;
      }
    `}
          </style>
          {novels.map((novel) => (
            <Link
              to={`/novel/${novel.id}`}
              key={novel.id}
              className="flex-shrink-0 w-[calc(50%-1rem)] sm:w-[calc(33.33%-1rem)] md:w-[calc(25%-1rem)] lg:w-[calc(20%-1rem)] xl:w-[calc(16.66%-1rem)] h-64 relative rounded-lg shadow-md overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              {(novel.coverSmallImage || novel.coverImage) && !imageErrors[novel.id] ? (
                <CachedImage
                  uri={getFirebaseDownloadUrl(novel.coverSmallImage || novel.coverImage || "/placeholder.svg")}
                  alt={`Cover for ${novel.title}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError(novel.id)}
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${getGenreColorClass(
                    novel.genres,
                  )} relative overflow-hidden`}
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-yellow-600"></div>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 left-2 w-4 h-4 border border-white rounded-full"></div>
                    <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute bottom-3 left-3 w-3 h-3 border border-white"></div>
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center">
                    <h3 className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1">{novel.title}</h3>
                    <div className="w-8 h-px bg-white opacity-50 mb-1"></div>
                    <p className="text-white text-xs opacity-75 truncate w-full">{novel.authorName}</p>
                  </div>
                  <div className="absolute right-0 top-1 w-px h-full bg-white opacity-20"></div>
                  <div className="absolute right-1 top-1 w-px h-full bg-white opacity-15"></div>
                </div>
              )}
              {/* Likes and Views */}
              <div className="absolute bottom-2 right-2 z-10 flex flex-col items-end space-y-0.5 text-white text-xs drop-shadow-sm">
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {novel.views || 0}
                </div>
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {novel.likes || 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center hidden py-8 bg-gray-800 rounded-xl shadow-md mx-4 sm:mx-0">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-white">No novels found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {title === "Discover Novels"
              ? "Try adjusting your filters to find more novels"
              : "Check back later for more stories!"}
          </p>
        </div>
      )}
    </section>
  )
}

export default NovelCarousel
