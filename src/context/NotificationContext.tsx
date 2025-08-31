"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "./AuthContext"

interface NotificationContextType {
  unreadCount: number
  incrementCount: () => void
  decrementCount: () => void
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  resetCount: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { currentUser } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0)
      return
    }

    // Listen to real-time changes in notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("toUserId", "==", currentUser.uid),
      where("read", "==", false),
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setUnreadCount(snapshot.size)
      },
      (error) => {
        console.error("Error listening to notifications:", error)
      },
    )

    return () => unsubscribe()
  }, [currentUser])

  const incrementCount = () => {
    setUnreadCount((prev) => prev + 1)
  }

  const decrementCount = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
      // The real-time listener will automatically update the count
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw error
    }
  }

  const markAllAsRead = async () => {
    try {
      // This would typically be handled by a cloud function or batch operation
      // For now, we'll reset the local count and let the real-time listener sync
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw error
    }
  }

  const resetCount = () => {
    setUnreadCount(0)
  }

  const value: NotificationContextType = {
    unreadCount,
    incrementCount,
    decrementCount,
    markAsRead,
    markAllAsRead,
    resetCount,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
