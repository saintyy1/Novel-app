import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming db is exported from here
import type { Novel } from "../types/novel"

interface FetchNovelsOptions {
  filter?: string // 'all', 'user', 'ai'
  genre?: string // 'all', specific genre
  searchQuery?: string
  sortOrder?: string // 'default', 'trending', 'new-releases'
}

export const fetchNovels = async ({
  filter = "all",
  genre = "all",
  searchQuery = "",
  sortOrder = "default",
}: FetchNovelsOptions = {}): Promise<Novel[]> => {
  try {
    const baseQuery = collection(db, "novels")
    let q: any

    // Start with published novels
    q = query(baseQuery, where("published", "==", true))

    // Apply primary sorting based on sortOrder from URL or default
    if (sortOrder === "trending") {
      q = query(q, orderBy("views", "desc"))
    } else if (sortOrder === "new-releases") {
      q = query(q, orderBy("createdAt", "desc"))
    } else if (sortOrder === "promotional") {
      q = query(q, where("isPromoted", "==", true), orderBy("promotionStartDate", "desc"))
    }
    else {
      // Default sorting for 'all' or other filters
      q = query(q, orderBy("createdAt", "desc"))
    }

    // Apply AI/User filter if specified (these apply on top of the sort order)
    if (filter === "ai") {
      q = query(q, where("isAIGenerated", "==", true))
    } else if (filter === "user") {
      q = query(q, where("isAIGenerated", "==", false))
    }

    const querySnapshot = await getDocs(q)
    let novelsData: Novel[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Novel, 'id'>;
      novelsData.push({ id: doc.id, ...data });
    })

    // Client-side filtering for genre and search query
    // Firestore's query limitations mean complex text search or array contains
    // on non-indexed fields are often done client-side after initial fetch.
    if (genre !== "all") {
      novelsData = novelsData.filter((novel) => novel.genres.includes(genre))
    }
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
