import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { fetchPoems } from "../services/poemService"
import type { Poem } from "../types/poem"
import SEOHead from "../components/SEOHead"

const Poems = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") || "all")
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort") || "new-releases")
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

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

  // Get poetry genre-based color gradients
  const getPoemGenreColorClass = (genres: string[]) => {
    if (genres.includes("Romantic")) return "from-rose-500 to-pink-600"
    if (genres.includes("Nature")) return "from-emerald-500 to-teal-600"
    if (genres.includes("Free Verse")) return "from-purple-500 to-fuchsia-600"
    if (genres.includes("Haiku")) return "from-cyan-500 to-blue-600"
    if (genres.includes("Sonnet")) return "from-amber-500 to-orange-600"
    if (genres.includes("Epic")) return "from-red-600 to-rose-800"
    if (genres.includes("Lyric")) return "from-pink-400 to-rose-500"
    if (genres.includes("Narrative")) return "from-indigo-500 to-purple-600"
    if (genres.includes("Limerick")) return "from-yellow-400 to-amber-500"
    if (genres.includes("Ballad")) return "from-violet-500 to-purple-600"
    if (genres.includes("Elegy")) return "from-slate-600 to-gray-700"
    if (genres.includes("Ode")) return "from-orange-500 to-red-600"
    return "from-rose-600 to-pink-600" // Default poetry gradient
  }

  const genres = [
    "Romantic",
    "Nature",
    "Free Verse",
    "Haiku",
    "Sonnet",
    "Epic",
    "Lyric",
    "Narrative",
    "Limerick",
    "Ballad",
    "Elegy",
    "Ode",
  ]

  useEffect(() => {
    const loadPoems = async () => {
      try {
        setLoading(true)
        const poemsData = await fetchPoems({
          genre: selectedGenre,
          searchQuery,
          sortOrder,
        })
        setPoems(poemsData)
      } catch (error) {
        console.error("Error loading poems:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPoems()
  }, [selectedGenre, searchQuery, sortOrder])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (searchQuery) {
      params.set("search", searchQuery)
    } else {
      params.delete("search")
    }
    setSearchParams(params)
  }

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    const params = new URLSearchParams(searchParams)
    if (genre !== "all") {
      params.set("genre", genre)
    } else {
      params.delete("genre")
    }
    setSearchParams(params)
  }

  const handleSortChange = (sort: string) => {
    setSortOrder(sort)
    const params = new URLSearchParams(searchParams)
    if (sort !== "new-releases") {
      params.set("sort", sort)
    } else {
      params.delete("sort")
    }
    setSearchParams(params)
  }

  return (
    <div className="max-w-7xl mx-auto py-12">
      <SEOHead
        title="Browse Poems - NovlNest"
        description="Discover amazing poetry from talented poets. Browse by genre, search for your favorites, and enjoy beautiful verse."
        keywords="poetry, poems, browse poems, romantic poetry, nature poems, haiku, sonnet, free verse"
        url="https://novlnest.com/poems"
        canonicalUrl="https://novlnest.com/poems"
      />

      {/* Poetic Header */}
      <div className="text-center mb-10">
        <div className="inline-block">
          <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-purple-400 mb-3">
            Poetry Collection
          </h1>
          <div className="flex items-center justify-center gap-3 text-gray-400 text-sm italic mb-2">
            <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
            <span>Where words dance and hearts resonate</span>
            <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-serif">Explore {poems.length} {poems.length === 1 ? 'verse' : 'verses'} from passionate poets</p>
        </div>
      </div>

      {/* Search and Filters - Artistic Design */}
      <div className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 rounded-2xl shadow-xl p-6 mb-10 border border-rose-900/20 backdrop-blur-sm">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for verses, poets, or themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-32 py-4 rounded-xl border-2 border-rose-900/30 bg-gray-900/50 text-white font-serif placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="absolute inset-y-2 right-2 px-6 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg hover:from-rose-500 hover:to-pink-500 transition-all font-medium shadow-lg shadow-rose-900/30"
            >
              Search
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-serif font-medium text-rose-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Poetry Style
            </label>
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-rose-900/30 bg-gray-900/50 text-white font-serif focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">All Poetry Styles</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-serif font-medium text-rose-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
              </svg>
              Sort Order
            </label>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-rose-900/30 bg-gray-900/50 text-white font-serif focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer transition-all"
              >
                <option value="new-releases">Newest Verses</option>
                <option value="trending">Most Admired</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Poems Collection */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="relative">
            <div className="animate-spin h-16 w-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full"></div>
            <svg className="absolute inset-0 m-auto w-8 h-8 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-4 text-gray-400 font-serif italic">Loading verses...</p>
        </div>
      ) : poems.length === 0 ? (
        <div className="text-center py-20">
          <svg className="mx-auto h-20 w-20 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-gray-400 text-lg font-serif mb-2">No poems found in this collection</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {poems.map((poem) => (
            <Link
              to={`/poem/${poem.id}`}
              key={poem.id}
              className="flex-shrink-0 w-full h-64 relative rounded-lg shadow-md overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              {poem.coverSmallImage && !imageErrors[poem.id] ? (
                <img
                  src={getFirebaseDownloadUrl(poem.coverSmallImage)}
                  alt={`Cover for ${poem.title}`}
                  className="w-full h-full object-cover"
                  onError={() => setImageErrors((prev) => ({ ...prev, [poem.id]: true }))}
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getPoemGenreColorClass(poem.genres || [])} relative overflow-hidden`}>
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-rose-300 to-pink-400"></div>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 left-2 w-4 h-4 border border-white rounded-full"></div>
                    <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute bottom-3 left-3 w-3 h-3 border border-white"></div>
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center">
                    <svg className="w-8 h-8 text-white/40 mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <h3 className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1 font-serif">{poem.title}</h3>
                    <div className="w-8 h-px bg-white opacity-50 mb-1"></div>
                    <p className="text-white text-xs opacity-75 truncate w-full font-serif italic">{poem.poetName}</p>
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
                  {poem.views || 0}
                </div>
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {poem.likes || 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Poems

