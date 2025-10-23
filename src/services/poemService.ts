import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Poem } from "../types/poem"

interface FetchPoemsOptions {
  genre?: string // 'all', specific genre
  searchQuery?: string
  sortOrder?: string // 'trending' (most views), 'new-releases' (newest)
}

export const fetchPoems = async ({
  genre = "all",
  searchQuery = "",
  sortOrder = "new-releases",
}: FetchPoemsOptions = {}): Promise<Poem[]> => {
  try {
    const baseQuery = collection(db, "poems")
    let q: any

    // Start with published poems
    q = query(baseQuery, where("published", "==", true))

    // Apply sorting based on sortOrder from URL
    if (sortOrder === "trending") {
      q = query(q, orderBy("views", "desc"))
    } else if (sortOrder === "promotional") {
      q = query(q, where("isPromoted", "==", true), orderBy("promotionStartDate", "desc"))
    } else {
      // Default to newest releases
      q = query(q, orderBy("createdAt", "desc"))
    }

    const querySnapshot = await getDocs(q)
    let poemsData: Poem[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Poem, 'id'>;
      poemsData.push({ id: doc.id, ...data });
    })

    // Client-side filtering for genre and search query
    if (genre !== "all") {
      poemsData = poemsData.filter((poem) => poem.genres.includes(genre))
    }
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      poemsData = poemsData.filter(
        (poem) =>
          poem.title.toLowerCase().includes(lowerCaseQuery) ||
          poem.content.toLowerCase().includes(lowerCaseQuery) ||
          poem.poetName.toLowerCase().includes(lowerCaseQuery),
      )
    }

    return poemsData
  } catch (error) {
    console.error("Error fetching poems:", error)
    throw error
  }
}

