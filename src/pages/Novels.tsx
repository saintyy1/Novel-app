"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import type { Novel } from "../types/novel"
import { fetchNovels } from "../services/novelService"

const Novels: React.FC = () => {
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
    ]

    useEffect(() => {
        loadNovels()
    }, [activeFilter, activeGenre]) // Re-fetch when filter or genre changes

    const loadNovels = async () => {
        setLoading(true)
        try {
            const novelsData = await fetchNovels(activeFilter, activeGenre, searchQuery)
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
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-[#E0E0E0] mb-4">Browse Novels</h1>
                <p className="text-xl text-[#B0B0B0] max-w-3xl mx-auto">
                    Discover a world of imagination with our collection of user-created and AI-generated novels
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
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
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
                            className={`text-sm text-[#E0E0E0] ${activeFilter === "all" ? "font-bold" : ""}`}
                            onClick={() => handleFilterChange("all")}
                        >
                            All Novels
                        </button>
                        <button
                            className={`text-sm text-[#E0E0E0] ${activeFilter === "user" ? "font-bold" : ""}`}
                            onClick={() => handleFilterChange("user")}
                        >
                            User Submitted
                        </button>
                        <button
                            className={`text-sm text-[#E0E0E0] ${activeFilter === "ai" ? "font-bold" : ""}`}
                            onClick={() => handleFilterChange("ai")}
                        >
                            AI Generated
                        </button>
                    </div>

                    <div className="flex items-center">
                        <span className="text-sm font-medium text-[#B0B0B0] mr-2">Genre:</span>
                        <select
                            className="rounded-md border-gray-300 dark:border-gray-600 py-1 pl-3 pr-10 text-base focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            )}        </div>
    )
}

export default Novels
