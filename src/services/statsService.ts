import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"

export interface GlobalStats {
  totalUsers: number
  activeUsers: number
  totalAuthors: number
  novelAuthors: number
  poets: number
  totalNovels: number
  pendingNovels: number
  publishedNovels: number
  totalPoems: number
  pendingPoems: number
  publishedPoems: number
  lastUpdated: string
}

export const INITIAL_STATS: GlobalStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalAuthors: 0,
  novelAuthors: 0,
  poets: 0,
  totalNovels: 0,
  pendingNovels: 0,
  publishedNovels: 0,
  totalPoems: 0,
  pendingPoems: 0,
  publishedPoems: 0,
  lastUpdated: new Date().toISOString()
}

/**
 * Fetches the global stats document from Firestore
 */
export const getGlobalStats = async (): Promise<GlobalStats> => {
  try {
    const statsDoc = await getDoc(doc(db, "stats", "global"))
    if (statsDoc.exists()) {
      return statsDoc.data() as GlobalStats
    }
    return INITIAL_STATS
  } catch (error) {
    console.error("Error fetching global stats:", error)
    return INITIAL_STATS
  }
}

/**
 * Atomically increments/decrements specific stat fields.
 * Costs exactly 1 write. Use this after every admin action.
 * Example: incrementStat({ publishedNovels: 1, pendingNovels: -1 })
 */
export const incrementStat = async (deltas: Partial<Record<keyof Omit<GlobalStats, 'lastUpdated'>, number>>) => {
  try {
    const { updateDoc, doc, increment } = await import("firebase/firestore")
    const { db } = await import("../firebase/config")
    const updates: Record<string, any> = { lastUpdated: new Date().toISOString() }
    for (const [key, value] of Object.entries(deltas)) {
      updates[key] = increment(value as number)
    }
    await updateDoc(doc(db, "stats", "global"), updates)
  } catch (error) {
    // Silently fail — stats drift is non-critical, admin can recount manually
    console.warn("Failed to update stats:", error)
  }
}

export const recalculateGlobalStats = async (): Promise<GlobalStats> => {
  try {
    // Fetch all users
    const usersSnap = await getDocs(collection(db, "users"))
    const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any))
    
    // Fetch all novels
    const novelsSnap = await getDocs(collection(db, "novels"))
    const novels = novelsSnap.docs.map(d => d.data() as any)
    
    // Fetch all poems
    const poemsSnap = await getDocs(collection(db, "poems"))
    const poems = poemsSnap.docs.map(d => d.data() as any)
    
    // Calculate unique authors
    const novelAuthorIds = new Set<string>()
    const poetIds = new Set<string>()
    const allAuthorIds = new Set<string>()
    
    novels.forEach((n: any) => {
      if (n.authorId) {
        novelAuthorIds.add(n.authorId)
        allAuthorIds.add(n.authorId)
      }
    })
    
    poems.forEach((p: any) => {
      if (p.poetId) {
        poetIds.add(p.poetId)
        allAuthorIds.add(p.poetId)
      }
    })
    
    const stats: GlobalStats = {
      totalUsers: users.length,
      activeUsers: users.filter((u: any) => u.isActive !== false).length,
      totalAuthors: allAuthorIds.size,
      novelAuthors: novelAuthorIds.size,
      poets: poetIds.size,
      totalNovels: novels.length,
      pendingNovels: novels.filter((n: any) => !n.published).length,
      publishedNovels: novels.filter((n: any) => n.published).length,
      totalPoems: poems.length,
      pendingPoems: poems.filter((p: any) => !p.published).length,
      publishedPoems: poems.filter((p: any) => p.published).length,
      lastUpdated: new Date().toISOString()
    }
    
    // Save to Firestore
    await setDoc(doc(db, "stats", "global"), stats)
    
    return stats
  } catch (error) {
    console.error("Error recalculating global stats:", error)
    throw error
  }
}
