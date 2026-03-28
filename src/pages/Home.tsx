"use client"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy, limit, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import type { Poem } from "../types/poem"
import NovelCarousel from "../components/NovelCarousel"
import PoemCarousel from "../components/PoemCarousel"
import InviteFriendsSection from "../components/InviteFriendsSection"
import HeroBanner from "../components/HeroBanner"
import SEOHead from "../components/SEOHead"
import { generateWebsiteStructuredData, generateBreadcrumbStructuredData, generateCollectionStructuredData } from "../utils/structuredData"
import { sendPromotionEndedNotification } from "../services/notificationService"
import { withCache, CACHE_TTL } from "../utils/cache"

interface BannerSlide {
  id: string
  imageUrl: string
  novelId?: string
  externalLink?: string
  title?: string
  alt?: string
}

const Home = () => {
  const [promotionalNovels, setPromotionalNovels] = useState<Novel[]>([])
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([])
  const [newReleaseNovels, setNewReleaseNovels] = useState<Novel[]>([])
  const [trendingPoems, setTrendingPoems] = useState<Poem[]>([])
  const [timelessStories, setTimelessStories] = useState<Novel[]>([])
  const [loadingPromotional, setLoadingPromotional] = useState<boolean>(true)
  const [loadingTrending, setLoadingTrending] = useState<boolean>(true)
  const [loadingNewReleases, setLoadingNewReleases] = useState<boolean>(true)
  const [loadingTimelessStories, setLoadingTimelessStories] = useState<boolean>(true)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [banners, setBanners] = useState<BannerSlide[]>([])
  const [loadingBanners, setLoadingBanners] = useState(true)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await withCache("home_banners", async () => {
          const q = query(
            collection(db, "banners"),
            where("isActive", "==", true),
            orderBy("priority", "asc")
          )
          const snapshot = await getDocs(q)
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as BannerSlide[]
        }, CACHE_TTL.FEED, (data) => data.map(b => b.imageUrl))
        setBanners(data)
      } catch (error) {
        console.error("Error fetching banners:", error)
      } finally {
        setLoadingBanners(false)
      }
    }
    fetchBanners()
  }, [])

  useEffect(() => {
    const fetchPromotionalNovels = async () => {
      setLoadingPromotional(true)
      try {
        const promotionalData = await withCache("home_promotional", async () => {
          const promotionalQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("isPromoted", "==", true),
            orderBy("createdAt", "desc"),
            limit(7),
          )
          const querySnapshot = await getDocs(promotionalQuery)
          const dataList: Novel[] = []
          const now = new Date()

          for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data() as any
            const endDate = data.promotionEndDate?.toDate?.() || data.promotionEndDate

            if (endDate && endDate < now) {
              if (!data.promotionEndNotificationSent) {
                try {
                  await sendPromotionEndedNotification(
                    data.authorId,
                    docSnap.id,
                    data.title
                  )
                } catch (error) {
                  console.error("Error sending notification:", error)
                }
              }
              await updateDoc(docSnap.ref, {
                isPromoted: false,
                promotionStartDate: null,
                promotionEndDate: null,
                reference: null,
                promotionPlan: null,
                promotionEndNotificationSent: true
              })
            } else {
              dataList.push({ id: docSnap.id, ...data } as Novel)
            }
          }
          return dataList
        }, CACHE_TTL.FEED, (data) => data.map(n => n.coverImage), 'feed')
        
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
        const trendingData = await withCache("home_trending", async () => {
          const trendingQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("isPromoted", "!=", true),
            orderBy("views", "desc"),
            limit(7),
          )
          const querySnapshot = await getDocs(trendingQuery)
          return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel))
        }, CACHE_TTL.FEED, (data) => data.map(n => n.coverImage), 'feed')
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
        const newReleaseData = await withCache("home_new_releases", async () => {
          const newReleaseQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("publicDomain", "==", false),
            orderBy("createdAt", "desc"),
            limit(7),
          )
          const querySnapshot = await getDocs(newReleaseQuery)
          return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel))
        }, CACHE_TTL.FEED, (data) => data.map(n => n.coverImage), 'feed')
        setNewReleaseNovels(newReleaseData)
      } catch (error) {
        console.error("Error fetching new release novels:", error)
      } finally {
        setLoadingNewReleases(false)
      }
    }
    fetchNewReleaseNovels()
  }, [])

  useEffect(() => {
    const fetchTimelessStories = async () => {
      setLoadingTimelessStories(true)
      try {
        const timelessData = await withCache("home_timeless", async () => {
          const timelessQuery = query(
            collection(db, "novels"),
            where("published", "==", true),
            where("publicDomain", "==", true),
            orderBy("views", "desc"),
            limit(7),
          )
          const querySnapshot = await getDocs(timelessQuery)
          return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel))
        }, CACHE_TTL.FEED, (data) => data.map(n => n.coverImage), 'feed')
        setTimelessStories(timelessData)
      } catch (error) {
        console.error("Error fetching timeless stories:", error)
      } finally {
        setLoadingTimelessStories(false)
      }
    }
    fetchTimelessStories()
  }, [])

  useEffect(() => {
    const fetchNewReleasePoems = async () => {
      setLoadingNewReleases(true)
      try {
        const poemData = await withCache("home_trending_poems", async () => {
          const poemQuery = query(
            collection(db, "poems"),
            where("published", "==", true),
            orderBy("views", "desc"),
            limit(7),
          )
          const querySnapshot = await getDocs(poemQuery)
          return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poem))
        }, CACHE_TTL.FEED, (data) => data.map(p => p.coverImage), 'feed')
        setTrendingPoems(poemData)
      } catch (error) {
        console.error("Error fetching trending poems:", error)
      } finally {
        setLoadingNewReleases(false)
      }
    }
    fetchNewReleasePoems()
  }, [])

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
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

      {/* Hero Banner Section */}
      {loadingBanners ? (
        <div className="flex justify-center items-center h-64">
          {/* Simple Tailwind Spinner */}
          <div className="w-12 h-12 border-4 border-t-primary border-gray-200 rounded-full animate-spin"></div>
        </div>
      ) : (
        <HeroBanner slides={banners} autoSlideInterval={5000} />
      )}

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

      <NovelCarousel
        title="Timeless Stories"
        novels={timelessStories}
        loading={loadingTimelessStories}
        seeAllLink="/novels/timeless-stories"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getGenreColorClass}
      />

      <PoemCarousel
        title="Poetry"
        poems={trendingPoems}
        loading={loadingNewReleases}
        seeAllLink="/poems"
        imageErrors={imageErrors}
        handleImageError={handleImageError}
        getGenreColorClass={getPoemGenreColorClass}
      />

      {/* Invite Friends Section */}
      <section className="py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <InviteFriendsSection />
      </section>
    </div>
  )
}

export default Home
