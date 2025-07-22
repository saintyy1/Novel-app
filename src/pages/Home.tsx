"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import SimpleNotificationListener from "../components/simple-notification-listener"
import NovelCarousel from "../components/NovelCarousel"

const Home = () => {
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([])
  const [newReleaseNovels, setNewReleaseNovels] = useState<Novel[]>([])
  const [loadingTrending, setLoadingTrending] = useState<boolean>(true)
  const [loadingNewReleases, setLoadingNewReleases] = useState<boolean>(true)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Fetch Trending Novels
  useEffect(() => {
    const fetchTrendingNovels = async () => {
      setLoadingTrending(true)
      try {
        const trendingQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          orderBy("views", "desc"), // Order by views for trending
          limit(7),
        )
        const querySnapshot = await getDocs(trendingQuery)
        const trendingData: Novel[] = []
        querySnapshot.forEach((doc) => {
          trendingData.push({ id: doc.id, ...doc.data() } as Novel)
        })
        setTrendingNovels(trendingData)
      } catch (error) {
        console.error("Error fetching trending novels:", error)
      } finally {
        setLoadingTrending(false)
      }
    }
    fetchTrendingNovels()
  }, [])

  // Fetch New Release Novels
  useEffect(() => {
    const fetchNewReleaseNovels = async () => {
      setLoadingNewReleases(true)
      try {
        const newReleaseQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          orderBy("createdAt", "desc"), // Order by createdAt for new releases
          limit(7),
        )
        const querySnapshot = await getDocs(newReleaseQuery)
        const newReleaseData: Novel[] = []
        querySnapshot.forEach((doc) => {
          newReleaseData.push({ id: doc.id, ...doc.data() } as Novel)
        })
        setNewReleaseNovels(newReleaseData)
      } catch (error) {
        console.error("Error fetching new release novels:", error)
      } finally {
        setLoadingNewReleases(false)
      }
    }
    fetchNewReleaseNovels()
  }, [])

  const handleImageError = (novelId: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [novelId]: true,
    }))
  }

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
      <SimpleNotificationListener />
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

      {/* Trending Novels Section */}
      <NovelCarousel
        title="Trending Novels"
        novels={trendingNovels}
        loading={loadingTrending}
        seeAllLink="/novels"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getGenreColorClass}
      />

      {/* New Releases Section */}
      <NovelCarousel
        title="New Releases"
        novels={newReleaseNovels}
        loading={loadingNewReleases}
        seeAllLink="/novels"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getGenreColorClass}
      />

      <section className="py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto">
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
