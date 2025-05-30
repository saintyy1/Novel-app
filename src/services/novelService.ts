import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"

// Add a novel to Firestore - this will be used by the AI generation process
export const addNovel = async (novel: Omit<Novel, "id">) => {
  try {
    // Initialize likes and views only for new novels
    const novelWithDefaults = {
      ...novel,
      likes: novel.likes !== undefined ? novel.likes : 0,
      views: novel.views !== undefined ? novel.views : 0,
    }

    const novelRef = doc(collection(db, "novels"))
    await setDoc(novelRef, novelWithDefaults)
    return novelRef.id
  } catch (error) {
    console.error("Error adding novel:", error)
    throw error
  }
}

// Fetch novels with filtering options - used by the novels listing page
export const fetchNovels = async (
  filter = "all",
  genre = "all",
  searchQuery = "",
  maxResults = 50,
): Promise<Novel[]> => {
  try {
    // Base query - always filter for published novels
    let novelQuery = query(
      collection(db, "novels"),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      limit(maxResults),
    )

    // Apply filter for AI or user-submitted novels
    if (filter === "ai") {
      novelQuery = query(
        collection(db, "novels"),
        where("published", "==", true),
        where("isAIGenerated", "==", true),
        orderBy("createdAt", "desc"),
        limit(maxResults),
      )
    } else if (filter === "user") {
      novelQuery = query(
        collection(db, "novels"),
        where("published", "==", true),
        where("isAIGenerated", "==", false),
        orderBy("createdAt", "desc"),
        limit(maxResults),
      )
    }

    // Execute the query
    const querySnapshot = await getDocs(novelQuery)
    let novelsData: Novel[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Preserve the actual likes and views from the database
      novelsData.push({
        id: doc.id,
        ...data,
      } as Novel)
    })

    // Filter by genre if a specific genre is selected
    if (genre !== "all") {
      novelsData = novelsData.filter((novel) => novel.genres.includes(genre))
    }

    // Filter by search query if provided
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      novelsData = novelsData.filter(
        (novel) =>
          novel.title.toLowerCase().includes(query) ||
          novel.summary.toLowerCase().includes(query) ||
          novel.authorName.toLowerCase().includes(query) ||
          novel.genres.some((g) => g.toLowerCase().includes(query)),
      )
    }

    return novelsData
  } catch (error) {
    console.error("Error fetching novels:", error)
    throw error
  }
}
