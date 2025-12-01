"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, query, where, getDocs, orderBy, limit, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import NovelCarousel from "../components/NovelCarousel"
import PromotionSection from "../components/PromotionSection"
import InviteFriendsSection from "../components/InviteFriendsSection"
import SEOHead from "../components/SEOHead"
import { generateWebsiteStructuredData, generateBreadcrumbStructuredData, generateCollectionStructuredData } from "../utils/structuredData"
import { sendPromotionEndedNotification } from "../services/notificationService"

const Home = () => {
  const [promotionalNovels, setPromotionalNovels] = useState<Novel[]>([])
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([])
  const [newReleaseNovels, setNewReleaseNovels] = useState<Novel[]>([])
  const [loadingPromotional, setLoadingPromotional] = useState<boolean>(true)
  const [loadingTrending, setLoadingTrending] = useState<boolean>(true)
  const [loadingNewReleases, setLoadingNewReleases] = useState<boolean>(true)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchPromotionalNovels = async () => {
      setLoadingPromotional(true)
      try {
        const promotionalQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          where("isPromoted", "==", true),
          orderBy("views", "desc"),
          limit(7),
        )
        const querySnapshot = await getDocs(promotionalQuery)
        const promotionalData: Novel[] = []

        const now = new Date()

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data() as any
          const endDate = data.promotionEndDate?.toDate?.() || data.promotionEndDate

          if (endDate && endDate < now) {
            // Send notification to the author that their promotion has ended
            // Only send once - check if notification hasn't been sent yet
            if (!data.promotionEndNotificationSent) {
              try {
                await sendPromotionEndedNotification(
                  data.authorId,
                  docSnap.id,
                  data.title
                )
                console.log(`Promotion ended notification sent for novel: ${data.title}`)
              } catch (error) {
                console.error("Error sending promotion ended notification:", error)
              }
            }

            // expired — update Firestore to set isPromoted back to false
            // Mark that notification has been sent
            await updateDoc(docSnap.ref, {
              isPromoted: false,
              promotionStartDate: null,
              promotionEndDate: null,
              reference: null,
              promotionPlan: null,
              promotionEndNotificationSent: true
            })
          } else {
            promotionalData.push({ id: docSnap.id, ...data } as Novel)
          }
        }

        setPromotionalNovels(promotionalData)
      } catch (error) {
        console.error("Error fetching promotional novels:", error)
      } finally {
        setLoadingPromotional(false)
      }
    }

    fetchPromotionalNovels()
  }, [])

  useEffect(() => {
    const fetchTrendingNovels = async () => {
      setLoadingTrending(true)
      try {
        const trendingQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          where("isPromoted", "!=", true),
          orderBy("views", "desc"),
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

  useEffect(() => {
    const fetchNewReleaseNovels = async () => {
      setLoadingNewReleases(true)
      try {
        const newReleaseQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          orderBy("createdAt", "desc"),
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
    if (genres.includes("Historical Fiction")) return "from-amber-500 to-yellow-600"
    if (genres.includes("Comedy")) return "from-teal-500 to-green-600"
    if (genres.includes("Drama")) return "from-violet-500 to-purple-600"
    if (genres.includes("Dystopian")) return "from-red-400 to-purple-500"
    if (genres.includes("Fiction")) return "from-gray-600 to-gray-800"
    if (genres.includes("Dark Romance")) return "from-rose-700 to-purple-900"
    return "from-gray-600 to-gray-800"
  }

  // Combine all novels for structured data
  const allNovels = [...promotionalNovels, ...trendingNovels, ...newReleaseNovels]
  const uniqueNovels = allNovels.filter((novel, index, self) =>
    index === self.findIndex(n => n.id === novel.id)
  )

  return (
    <div className="min-h-screen">
      <SEOHead
        title="NovlNest - Free Online Novels & Stories | Read & Write Fiction"
        description="Discover thousands of free novels and stories on NovlNest. Read trending fiction, new releases, and share your own creative writing. The best platform for readers and writers."
        keywords="free novels, online stories, fiction reading, creative writing, novel platform, digital books, trending novels, new releases, wattpad alternative, storytelling community"
        url="https://novlnest.com"
        canonicalUrl="https://novlnest.com"
        structuredData={[generateWebsiteStructuredData(), generateBreadcrumbStructuredData([{ name: "Home", url: "https://novlnest.com" }]), generateCollectionStructuredData(uniqueNovels, "Free Online Novels & Stories | Read & Write Fiction"), generateCollectionStructuredData(uniqueNovels, "Promotional Novels"), generateCollectionStructuredData(uniqueNovels, "Trending Novels"), generateCollectionStructuredData(uniqueNovels, "New Releases")]}
      />

      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-20 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-50 rounded-b-3xl"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Discover Extraordinary Stories
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-purple-100">
              From new voices to hidden gems, explore novels created and shared by real storytellers.
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

      <PromotionSection />

      {promotionalNovels.length > 0 && (
        <>
          <NovelCarousel
            title="Promotions"
            novels={promotionalNovels}
            loading={loadingPromotional}
            seeAllLink="/novels/promotional"
            imageErrors={imageErrors}
            handleImageError={handleImageError}
            getGenreColorClass={getGenreColorClass}
          />
        </>
      )}

      <NovelCarousel
        title="Trending Novels"
        novels={trendingNovels}
        loading={loadingTrending}
        seeAllLink="/novels/trending"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getGenreColorClass}
      />

      <NovelCarousel
        title="New Releases"
        novels={newReleaseNovels}
        loading={loadingNewReleases}
        seeAllLink="/novels/new-releases"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getGenreColorClass}
      />

      {/* Poetry Feature Announcement */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="relative bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-full"></div>
            <div className="absolute top-12 right-8 w-8 h-8 bg-white rounded-full"></div>
            <div className="absolute bottom-6 left-12 w-12 h-12 border-2 border-white"></div>
            <div className="absolute bottom-12 right-16 w-6 h-6 bg-white/50 rounded-full"></div>
          </div>

          <div className="relative px-6 py-10 md:py-12 md:px-12 flex flex-col md:flex-row items-center gap-6">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left text-white">
              <h3 className="text-2xl md:text-3xl font-serif font-bold mb-2">
                Discover Poetry
              </h3>
              <p className="text-base md:text-lg text-rose-50 font-serif italic mb-4 max-w-2xl">
                "Words that dance, emotions that resonate. Explore our new poetry collection and let verses touch your soul."
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/poems"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-rose-600 rounded-full font-serif font-bold text-base hover:bg-rose-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  Browse Poetry
                </Link>
                <Link
                  to="/submit-poem"
                  className="inline-flex items-center justify-center px-6 py-3 bg-rose-700/50 backdrop-blur-sm text-white rounded-full font-serif font-bold text-base hover:bg-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-white/30 hover:border-white/50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Submit Your Poem
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invite Friends Section */}
      <section className="py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <InviteFriendsSection />
      </section>
    </div>
  )
}

export default Home
