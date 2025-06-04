import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import FeaturedNovel from "../components/FeaturedNovel"

const Home = () => {
  const [novels, setNovels] = useState<Novel[]>([])
  const [featuredNovel, setFeaturedNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [activeGenre, setActiveGenre] = useState<string>("all")
  const [searchQuery] = useState<string>("")
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
  ]

  useEffect(() => {
    const fetchNovels = async () => {
      setLoading(true)
      try {
        let novelQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          orderBy("createdAt", "desc"),
          limit(4),
        )

        if (activeFilter === "ai") {
          novelQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("isAIGenerated", "==", true),
            orderBy("createdAt", "desc"),
            limit(4),
          )
        } else if (activeFilter === "user") {
          novelQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("isAIGenerated", "==", false),
            orderBy("createdAt", "desc"),
            limit(4),
          )
        }

        const querySnapshot = await getDocs(novelQuery)
        const novelsData: Novel[] = []

        querySnapshot.forEach((doc) => {
          novelsData.push({ id: doc.id, ...doc.data() } as Novel)
        })

        // Filter by genre if a specific genre is selected
        const filteredNovels =
          activeGenre === "all" ? novelsData : novelsData.filter((novel) => novel.genres.includes(activeGenre))

        // Set featured novel (first one or random)
        if (filteredNovels.length > 0) {
          setFeaturedNovel(filteredNovels[0])
        }

        setNovels(filteredNovels)
      } catch (error) {
        console.error("Error fetching novels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNovels()
  }, [activeFilter, activeGenre])

  const handleImageError = (novelId: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [novelId]: true,
    }))
  }

  // Function to get genre-based color class
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
    return "from-gray-600 to-gray-800" // Default
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-20 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-50 rounded-b-3xl"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Discover Extraordinary Stories
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-purple-100">
              Explore a world of imagination with user-created novels and AI-generated content
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/novels"
                className="px-8 py-3 bg-white text-purple-900 rounded-full font-bold text-lg hover:bg-purple-100 transition duration-300 shadow-lg"
              >
                Browse Novels
              </Link>
              <Link
                to="/submit"
                className="px-8 py-3 bg-purple-600 text-white rounded-full font-bold text-lg hover:bg-purple-700 transition duration-300 shadow-lg border border-purple-500"
              >
                Submit Your Novel
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Novel */}
      {featuredNovel && (
        <section className="py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#E0E0E0]">Featured Novel</h2>
          {/* Featured Novel */}
          {featuredNovel && <FeaturedNovel novel={featuredNovel} />}
        </section>
      )}

      {/* Novel Filters */}
      <section className="py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold text-[#E0E0E0]">Discover Novels</h2>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex rounded-md shadow-sm">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-l-md ${activeFilter === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } border border-gray-300 dark:border-gray-600`}
                onClick={() => setActiveFilter("all")}
              >
                All
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeFilter === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } border-t border-b border-gray-300 dark:border-gray-600`}
                onClick={() => setActiveFilter("user")}
              >
                User Submitted
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-r-md ${activeFilter === "ai"
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } border border-gray-300 dark:border-gray-600`}
                onClick={() => setActiveFilter("ai")}
              >
                AI Generated
              </button>
            </div>

            <select
              className="block w-full sm:w-auto rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={activeGenre}
              onChange={(e) => setActiveGenre(e.target.value)}
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

        {/* Novels Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {novels.map((novel) => (
              <Link
                to={`/novel/${novel.id}`}
                key={novel.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col"
              >
                {/* Cover Image - Custom or Generated */}
                {novel.coverImage && !imageErrors[novel.id] ? (
                  // Custom Cover Image
                  <div className="h-32 overflow-hidden">
                    <img
                      src={novel.coverImage || "/placeholder.svg"}
                      alt={`Cover for ${novel.title}`}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(novel.id)}
                    />
                  </div>
                ) : (
                  // Generated Book Cover Design
                  <div className={`h-32 bg-gradient-to-br ${getGenreColorClass(novel.genres)} relative overflow-hidden`}>
                    {/* Book spine effect */}
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-yellow-600"></div>

                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 left-2 w-4 h-4 border border-white rounded-full"></div>
                      <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full"></div>
                      <div className="absolute bottom-3 left-3 w-3 h-3 border border-white"></div>
                    </div>

                    {/* Title on cover */}
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center">
                      <h3 className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1">{novel.title}</h3>
                      <div className="w-8 h-px bg-white opacity-50 mb-1"></div>
                      <p className="text-white text-xs opacity-75 truncate w-full">{novel.authorName}</p>
                    </div>

                    {/* Book pages effect */}
                    <div className="absolute right-0 top-1 w-px h-full bg-white opacity-20"></div>
                    <div className="absolute right-1 top-1 w-px h-full bg-white opacity-15"></div>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-3 flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${novel.isAIGenerated
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        }`}
                    >
                      {novel.isAIGenerated ? "AI" : "User"}
                    </span>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
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
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{novel.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 flex-grow">{novel.summary}</p>

                  <div className="flex flex-wrap gap-1 mt-auto">
                    {novel.genres.slice(0, 2).map((genre, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-700 dark:text-gray-300"
                      >
                        {genre}
                      </span>
                    ))}
                    {novel.genres.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-700 dark:text-gray-300">
                        +{novel.genres.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
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
            <h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No novels found</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchQuery || activeGenre !== "all"
                ? "Try adjusting your filters to find more novels"
                : "Be the first to submit a novel!"}
            </p>
            <div className="mt-6">
              <Link
                to="/submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
              >
                Submit a Novel
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Call to Action */}
      <section className="py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-12 md:py-16 md:px-12 text-center text-white">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">Ready to share your story?</h2>
            <p className="text-lg max-w-3xl mx-auto mb-8">
              Join our community of writers and readers. Submit your novel today and let your imagination shine.
            </p>
            <Link
              to="/submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition duration-300 shadow-lg"
            >
              Start Writing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
