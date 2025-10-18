"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom" // Import useParams
import type { Novel } from "../types/novel"
import { fetchNovels } from "../services/novelService" // Import the service
import SEOHead from "../components/SEOHead"
import { generateCollectionStructuredData } from "../utils/structuredData"

const Novels: React.FC = () => {
  const { type } = useParams() // Get the 'type' parameter from the URL (e.g., 'trending', 'new-releases', promotional)
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [activeGenre, setActiveGenre] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [totalNovels, setTotalNovels] = useState<number>(0)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const genres = [
    "Fantasy",
    "Sci-Fi",
    "Romance",
    "Mystery",
    "Horror",
    "Adventure",
    "Thriller",
    "Historical",
    "Comedy",
    "Drama",
    "Dystopian",
    "Fiction",
    "Dark Romance",
  ]

  // Determine the effective sort order based on URL parameter
  const effectiveSortOrder = type || "default"

  useEffect(() => {
    loadNovels()
  }, [activeFilter, activeGenre, searchQuery, effectiveSortOrder]) // Re-fetch when filter, genre, search, or URL type changes

  const loadNovels = async () => {
    setLoading(true)
    try {
      const novelsData = await fetchNovels({
        filter: activeFilter,
        genre: activeGenre,
        searchQuery: searchQuery,
        sortOrder: effectiveSortOrder, // Pass the effective sort order to the service
      })
      setNovels(novelsData)
      setTotalNovels(novelsData.length)
    } catch (error) {
      console.error("Error loading novels:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadNovels()
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveGenre(e.target.value)
  }

  const handleImageError = (novelId: string) => {
    console.log(`Image failed to load for novel ${novelId}`) // Debug log
    setImageErrors((prev) => ({
      ...prev,
      [novelId]: true,
    }))
  }

  // Function to convert Firebase Storage URLs to download URLs that bypass CORS
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

  // Function to get genre-based color class for fallback covers
  const getGenreColorClass = (genres: string[]) => {
    if (genres.includes("Fantasy")) return "from-purple-500 to-indigo-600"
    if (genres.includes("Sci-Fi")) return "from-blue-500 to-cyan-600"
    if (genres.includes("Romance")) return "from-pink-500 to-rose-600"
    if (genres.includes("Mystery")) return "from-yellow-500 to-amber-600"
    if (genres.includes("Horror")) return "from-red-500 to-rose-800"
    if (genres.includes("Adventure")) return "from-green-500 to-emerald-600"
    if (genres.includes("Thriller")) return "from-orange-500 to-red-600"
    if (genres.includes("Historical")) return "from-amber-500 to-yellow-600"
    if (genres.includes("Comedy")) return "from-teal-500 to-green-600"
    if (genres.includes("Drama")) return "from-violet-500 to-purple-600"
    if (genres.includes("Dystopian")) return "from-red-400 to-purple-500"
    if (genres.includes("Fiction")) return "from-gray-600 to-gray-800"
    if (genres.includes("Dark Romance")) return "from-rose-700 to-purple-900"
    return "from-gray-600 to-gray-800" // Default
  }

  // Generate page title and description based on type
  const getPageTitle = () => {
    switch (effectiveSortOrder) {
      case "promotional": return "Promotional Novels - Free Online Stories | NovlNest"
      case "trending": return "Trending Novels - Most Popular Stories | NovlNest"
      case "new-releases": return "New Release Novels - Latest Stories | NovlNest"
      default: return "Browse Novels - Free Online Stories & Fiction | NovlNest"
    }
  }

  const getPageDescription = () => {
    switch (effectiveSortOrder) {
      case "promotional": return "Discover featured promotional novels on NovlNest. Read free online stories from talented authors and explore new genres."
      case "trending": return "Explore the most popular and trending novels on NovlNest. Read free online stories that readers love most."
      case "new-releases": return "Read the latest new release novels on NovlNest. Discover fresh stories and new chapters from your favorite authors."
      default: return "Browse thousands of free novels and stories on NovlNest. Find your next favorite book from our collection of fiction, romance, fantasy, and more."
    }
  }

  const getPageKeywords = () => {
    const baseKeywords = "free novels, online stories, fiction reading, digital books, novel platform"
    switch (effectiveSortOrder) {
      case "promotional": return `${baseKeywords}, featured novels, promotional stories, highlighted books`
      case "trending": return `${baseKeywords}, trending novels, popular stories, most read books, viral novels`
      case "new-releases": return `${baseKeywords}, new novels, latest stories, recent releases, fresh content`
      default: return `${baseKeywords}, browse novels, story collection, reading platform, wattpad alternative`
    }
  }

  return (
    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-12">
      <SEOHead
        title={getPageTitle()}
        description={getPageDescription()}
        keywords={getPageKeywords()}
        url={`https://novlnest.com/novels${type ? `/${type}` : ''}`}
        canonicalUrl={`https://novlnest.com/novels${type ? `/${type}` : ''}`}
        structuredData={generateCollectionStructuredData(novels, effectiveSortOrder === "promotional" ? "Promotional Novels" : effectiveSortOrder === "trending" ? "Trending Novels" : effectiveSortOrder === "new-releases" ? "New Release Novels" : "Browse Novels")}
      />
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-[#E0E0E0] mb-4">
          {effectiveSortOrder === "promotional"
            ? "Promotional Novels"
            : effectiveSortOrder === "trending"
              ? "Trending Novels"
              : effectiveSortOrder === "new-releases"
                ? "New Releases"
                : "Browse Novels"}
        </h1>
        <p className="text-xl text-[#B0B0B0] max-w-3xl mx-auto">
          From new voices to hidden gems, explore novels created and shared by real storytellers.
        </p>
      </div>
      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-10">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title, author, or keywords..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-4 text-white bg-purple-600 rounded-r-lg hover:bg-purple-700 focus:outline-none"
            >
              Search
            </button>
          </div>
        </form>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-[#B0B0B0] mr-2">Filter by:</span>
            <button
              className={`text-sm cursor-pointer text-[#E0E0E0] ${activeFilter === "all" ? "font-bold" : ""}`}
              onClick={() => handleFilterChange("all")}
            >
              All Novels
            </button>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-[#B0B0B0] mr-2">Genre:</span>
            <select
              className="rounded-md cursor-pointer border-gray-600 py-1 pl-3 pr-10 text-base focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              value={activeGenre}
              onChange={handleGenreChange}
            >
              <option value="all">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#E0E0E0]">
          {loading ? "Loading novels..." : `${totalNovels} novels found`}
        </h2>
        <div className="text-sm text-[#B0B0B0]">
          Showing {novels.length} of {totalNovels} novels
        </div>
      </div>
      {/* Novels Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-300 dark:bg-gray-700"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/6 mb-2"></div>
                <div className="flex justify-between items-center mt-2">
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : novels.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 justify-center">
          {novels.map((novel) => (
            <Link
              to={`/novel/${novel.id}`}
              key={novel.id}
              className="flex rounded-lg shadow-md overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-gray-800 border border-gray-700"
            >
              {/* Image Section (fixed size) */}
              <div className="w-40 h-64 flex-shrink-0 relative">
                {(novel.coverSmallImage || novel.coverImage) && !imageErrors[novel.id] ? (
                  <img
                    src={getFirebaseDownloadUrl(novel.coverSmallImage || novel.coverImage || "/placeholder.svg")}
                    alt={`Cover for ${novel.title}`}
                    className="w-full h-full object-cover"
                    onError={() => {
                      handleImageError(novel.id)
                    }}
                    loading="lazy"
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
                {/* Likes and Views - positioned at the very bottom right within the image section */}
                <span className="absolute bottom-2 right-2 z-10 flex flex-col items-end space-y-0.5 text-white text-xs drop-shadow-sm">
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
                </span>
              </div>

              {/* Info Section (beside the image) */}
              <div className="flex-1 p-4 bg-gray-800/70 backdrop-blur-sm flex flex-col justify-center items-center text-center">
                <div className="flex flex-col items-center">
                  <h3 className="text-white text-lg font-bold mb-1 line-clamp-2">{novel.title}</h3>
                  <p className="text-gray-200 text-sm line-clamp-3 mb-2">{novel.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-auto justify-center">
                    {novel.genres.slice(0, 2).map((genre, index) => (
                      <span key={index} className="px-2 py-1 bg-white/20 text-xs rounded-full text-white">
                        {genre}
                      </span>
                    ))}
                    {novel.genres.length > 2 && (
                      <span className="px-2 py-1 bg-white/20 text-xs rounded-full text-white">
                        +{novel.genres.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-[#B0B0B0]">No novels found.</div>
      )}
    </div>
  )
}

export default Novels
