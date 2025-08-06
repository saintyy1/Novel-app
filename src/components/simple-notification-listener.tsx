"use client"

import { useEffect } from "react"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import { showNewChapterToast } from "../utils/toast-utils"

// Simple component to show recent chapter updates when users visit the site
const SimpleNotificationListener = () => {
  useEffect(() => {
    const showRecentUpdates = async () => {
      try {
        // Get novels updated in the last 12 hours
        const twelveHoursAgo = new Date()
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

        const novelsQuery = query(
          collection(db, "novels"),
          where("published", "==", true),
          where("updatedAt", ">=", twelveHoursAgo.toISOString()),
          orderBy("updatedAt", "desc"),
          limit(3), // Show only the 3 most recent updates
        )
        const querySnapshot = await getDocs(novelsQuery)
        const recentUpdates: Novel[] = []

        querySnapshot.forEach((doc) => {
          recentUpdates.push({ id: doc.id, ...doc.data() } as Novel)
        })

        // Show notifications for recent updates (with a small delay between each)
        recentUpdates.forEach((novel, index) => {
          if (novel.chapters && novel.chapters.length > 0) {
            setTimeout(() => {
              showNewChapterToast(
                novel.title,
                novel.chapters.length,
                `Chapter ${novel.chapters.length} has been added to "${novel.title}"`,
              )
            }, index * 3000) // 3 second delay between notifications
          }
        })
      } catch (error) {
        console.error("Error fetching recent updates:", error)
      }
    }

    // Show recent updates after a short delay when component mounts
    const timer = setTimeout(showRecentUpdates, 3000) // 3 second delay after page load
    return () => clearTimeout(timer)
  }, [])

  return null // This component doesn't render anything
}

export default SimpleNotificationListener
