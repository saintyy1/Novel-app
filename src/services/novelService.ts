import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming db is exported from here
import type { Novel } from "../types/novel"
import { withCache, CACHE_TTL } from "../utils/cache"

interface FetchNovelsOptions {
  filter?: string // 'all', 'user', 'ai'
  genre?: string // 'all', specific genre
  searchQuery?: string
  sortOrder?: string // 'default', 'trending', 'new-releases', 'promotional', 'timeless-stories'
}

export const fetchNovels = async ({
  filter = "all",
  genre = "all",
  searchQuery = "",
  sortOrder = "default",
}: FetchNovelsOptions = {}): Promise<Novel[]> => {
  try {
    const cacheKey = `novels_feed_${filter}_${genre}_${sortOrder}`

    let novelsData = await withCache(cacheKey, async () => {
      const baseQuery = collection(db, "novels")
      let q: any

      // Start with published novels
      q = query(baseQuery, where("published", "==", true))

      // Apply primary sorting based on sortOrder from URL or default
      if (sortOrder === "trending") {
        q = query(q, where("publicDomain", "==", false), orderBy("views", "desc"))
      } else if (sortOrder === "new-releases") {
        q = query(q, where("publicDomain", "==", false), orderBy("createdAt", "desc"))
      } else if (sortOrder === "promotional") {
        q = query(q, where("isPromoted", "==", true), where("publicDomain", "==", false), orderBy("promotionStartDate", "desc"))
      } else if (sortOrder === "timeless-stories") {
        q = query(q, where("publicDomain", "==", true), orderBy("views", "desc"))
      }
      else {
        // Default sorting for 'all' or other filters
        q = query(q, where("publicDomain", "==", false), orderBy("createdAt", "desc"))
      }

      // Apply AI/User filter if specified (these apply on top of the sort order)
      if (filter === "ai") {
        q = query(q, where("isAIGenerated", "==", true))
      } else if (filter === "user") {
        q = query(q, where("isAIGenerated", "==", false))
      }

      const querySnapshot = await getDocs(q)
      const fetchedData: Novel[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Novel, 'id'>
        fetchedData.push({ id: doc.id, ...data })
      })
      
      return fetchedData
    }, CACHE_TTL.FEED, (data) => data.map(n => n.coverImage), 'feed') // 🔥 Pre-fetch covers and strip fields

    // Client-side filtering for genre and search query
    // This allows search to happen instantly over cached data
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      novelsData = novelsData.filter(
        (novel) =>
          novel.title.toLowerCase().includes(lowerCaseQuery) ||
          novel.summary.toLowerCase().includes(lowerCaseQuery) ||
          novel.authorName.toLowerCase().includes(lowerCaseQuery),
      )
    }

    return novelsData
  } catch (error) {
    console.error("Error fetching novels:", error)
    throw error
  }
}
