"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom" // Import useParams
import type { Novel } from "../types/novel"
import { fetchNovels } from "../services/novelService" // Import the service
import SEOHead from "../components/SEOHead"
import CachedImage from "../components/CachedImage"
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
    "Historical Fiction",
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
    if (genres.includes("Historical Fiction")) return "from-amber-500 to-yellow-600"
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
      
      {/* Beautiful Header */}
      <div className="text-center mb-10">
        <div className="inline-block">
          <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-3">
          {effectiveSortOrder === "promotional"
            ? "Promotional Novels"
            : effectiveSortOrder === "trending"
              ? "Trending Novels"
              : effectiveSortOrder === "new-releases"
                ? "New Releases"
                  : "Story Collection"}
        </h1>
          <div className="flex items-center justify-center gap-3 text-gray-400 text-sm italic mb-2">
            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Where stories come alive and imaginations soar</span>
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-serif">Explore {novels.length} {novels.length === 1 ? 'story' : 'stories'} from passionate storytellers</p>
        </div>
      </div>
      {/* Search and Filters - Artistic Design */}
      <div className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 rounded-2xl shadow-xl p-6 mb-10 border border-purple-900/20 backdrop-blur-sm">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for stories, authors, or themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-32 py-4 rounded-xl border-2 border-purple-900/30 bg-gray-900/50 text-white font-serif placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="absolute inset-y-2 right-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium shadow-lg shadow-purple-900/30"
            >
              Search
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-serif font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Story Genre
            </label>
            <div className="relative">
            <select
              value={activeGenre}
              onChange={handleGenreChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-900/30 bg-gray-900/50 text-white font-serif focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-serif font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
              </svg>
              Display Order
            </label>
            <div className="relative">
              <select
                value={activeFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-900/30 bg-gray-900/50 text-white font-serif focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">All Stories</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
          </div>
        </div>
      </div>
        </div>
      </div>
      {/* Novels Collection */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="relative">
            <div className="animate-spin h-16 w-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full"></div>
            <svg className="absolute inset-0 m-auto w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
                </div>
          <p className="mt-4 text-gray-400 font-serif italic">Loading stories...</p>
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
                  <CachedImage
                    uri={getFirebaseDownloadUrl(novel.coverSmallImage || novel.coverImage || "/placeholder.svg")}
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
        <div className="text-center py-20">
          <svg className="mx-auto h-20 w-20 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-400 text-lg font-serif mb-2">No novels found in this collection</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

export default Novels
