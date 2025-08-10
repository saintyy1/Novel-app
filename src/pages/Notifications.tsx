"use client"
import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom" // Import useNavigate
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { UserPlus, MessageSquare, Heart, CheckCircle, Mail, Megaphone, BookOpen } from "lucide-react" // Import Lucide icons

interface Notification {
  id: string
  type:
    | "follow"
    | "novel_like"
    | "novel_comment"
    | "novel_reply"
    | "comment_reply"
    | "novel_added_to_library"
    | "novel_finished"
    | "followed_author_announcement"
  fromUserId?: string
  fromUserName?: string
  toUserId: string
  novelId?: string
  novelTitle?: string
  commentContent?: string
  parentId?: string // For replies
  announcementContent?: string // For announcements
  createdAt: string
  read: boolean
  fromUserPhotoURL?: string
}

const NotificationsPage = () => {
  const { currentUser, loading: authLoading } = useAuth()
  const navigate = useNavigate() // Initialize useNavigate
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fromUsersData, setFromUsersData] = useState<Record<string, { displayName: string; photoURL?: string }>>({})

  const getUserInitials = useCallback((name: string | null | undefined) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }, [])

  useEffect(() => {
    if (authLoading || !currentUser) {
      setLoading(false)
      return
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("toUserId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      async (snapshot) => {
        const fetchedNotifications: Notification[] = []
        const uniqueFromUserIds = new Set<string>()

        snapshot.forEach((doc) => {
          const notification = { id: doc.id, ...doc.data() } as Notification
          fetchedNotifications.push(notification)
          if (notification.fromUserId) {
            uniqueFromUserIds.add(notification.fromUserId)
          }
        })

        const newFromUsersData: Record<string, { displayName: string; photoURL?: string }> = { ...fromUsersData }
        const fetchPromises: Promise<void>[] = []

        uniqueFromUserIds.forEach((userId) => {
          if (!newFromUsersData[userId]) {
            fetchPromises.push(
              getDoc(doc(db, "users", userId))
                .then((userDoc) => {
                  if (userDoc.exists()) {
                    const userData = userDoc.data()
                    newFromUsersData[userId] = {
                      displayName: userData.displayName || "Unknown User",
                      photoURL: userData.photoURL,
                    }
                  } else {
                    newFromUsersData[userId] = { displayName: "Deleted User" }
                  }
                })
                .catch((err) => {
                  console.error(`Error fetching user data for ${userId}:`, err)
                  newFromUsersData[userId] = { displayName: "Error User" }
                }),
            )
          }
        })

        await Promise.all(fetchPromises)
        setFromUsersData(newFromUsersData)
        setNotifications(fetchedNotifications)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching notifications:", err)
        setError("Failed to load notifications.")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [currentUser, authLoading, fromUsersData])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }, [])

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      markAsRead(notification.id)
      navigate(getNotificationLink(notification))
    },
    [markAsRead, navigate],
  )

  const renderNotificationAvatarOrIcon = (notification: Notification) => {
    const fromUserData = notification.fromUserId ? fromUsersData[notification.fromUserId] : null

    if (fromUserData?.photoURL) {
      return (
        <img
          src={fromUserData.photoURL || "/placeholder.svg"}
          alt={fromUserData.displayName}
          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
        />
      )
    } else if (fromUserData?.displayName) {
      return (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {getUserInitials(fromUserData.displayName)}
        </div>
      )
    } else {
      switch (notification.type) {
        case "follow":
          return <UserPlus className="h-5 w-5 text-purple-400" />
        case "novel_like":
          return <Heart className="h-5 w-5 text-red-400" />
        case "novel_comment":
        case "novel_reply":
        case "comment_reply":
          return <MessageSquare className="h-5 w-5 text-blue-400" />
        case "followed_author_announcement": // Use Megaphone for followed author announcements
          return <Megaphone className="h-5 w-5 text-yellow-400" />
        case "novel_added_to_library": // New icon for added to library
          return <BookOpen className="h-5 w-5 text-green-400" />
        case "novel_finished": // New icon for novel finished
          return <CheckCircle className="h-5 w-5 text-green-400" />
        default:
          return <Mail className="h-5 w-5 text-gray-400" />
      }
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    const fromUserDisplayName = notification.fromUserId
      ? fromUsersData[notification.fromUserId]?.displayName || notification.fromUserName || "Someone"
      : notification.fromUserName || "Someone"

    const fromUserLink = notification.fromUserId ? (
      <Link
        to={`/profile/${notification.fromUserId}`}
        className="font-semibold text-purple-400 hover:underline"
        onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
      >
        {fromUserDisplayName}
      </Link>
    ) : (
      <span className="font-semibold">{fromUserDisplayName}</span>
    )

    switch (notification.type) {
      case "follow":
        return <>{fromUserLink} started following you.</>
      case "novel_like":
        return (
          <>
            {fromUserLink} liked your novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
            >
              "{notification.novelTitle}"
            </Link>
            .
          </>
        )
      case "novel_comment":
        return (
          <>
            {fromUserLink} commented on your novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
            >
              "{notification.novelTitle}"
            </Link>
            : "{notification.commentContent}"
          </>
        )
      case "novel_reply":
        return (
          <>
            {fromUserLink} replied to a comment on your novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
            >
              "{notification.novelTitle}"
            </Link>
            : "{notification.commentContent}"
          </>
        )
      case "comment_reply":
        return (
          <>
            {fromUserLink} replied to your comment on novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              "{notification.novelTitle}"
            </Link>
            : "{notification.commentContent}"
          </>
        )
      case "followed_author_announcement": // New message for followed author announcements
        return (
          <>
            {fromUserLink} posted an announcement: "{notification.announcementContent}"
          </>
        )
      case "novel_added_to_library": // New message for added to library
        return (
          <>
            {fromUserLink} added your novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              "{notification.novelTitle}"
            </Link>{" "}
            to their library.
          </>
        )
      case "novel_finished": // New message for novel finished
        return (
          <>
            {fromUserLink} marked your novel{" "}
            <Link
              to={`/novel/${notification.novelId}`}
              className="text-purple-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              "{notification.novelTitle}"
            </Link>{" "}
            as finished!
          </>
        )
      default:
        return "You have a new notification."
    }
  }

  const getNotificationLink = (notification: Notification) => {
    switch (notification.type) {
      case "follow":
        return `/profile/${notification.fromUserId}`
      case "novel_like":
      case "novel_comment":
      case "novel_reply":
      case "comment_reply":
      case "novel_added_to_library": // Link to novel for added to library
      case "novel_finished": // Link to novel for novel finished
        return `/novel/${notification.novelId}`
      case "followed_author_announcement": // Link to author's profile for announcements
        return `/profile/${notification.fromUserId}`
      default:
        return "#"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your notifications</h2>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <h1 className="text-3xl font-bold text-white mb-8">Your Notifications</h1>
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}
        {notifications.length === 0 ? (
          <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h3 className="mt-2 text-xl font-medium text-white">No new notifications</h3>
            <p className="mt-1 text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div // Changed from Link to div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)} // Handle click for navigation and mark as read
                className={`flex items-start p-4 rounded-xl shadow-sm transition-all duration-200 group cursor-pointer ${
                  notification.read
                    ? "bg-gray-800 text-gray-400"
                    : "bg-purple-900/20 text-white border border-purple-700 hover:bg-purple-900/30"
                }`}
              >
                <div className="flex-shrink-0 mr-4 mt-1">{renderNotificationAvatarOrIcon(notification)}</div>
                <div className="flex-1">
                  <p className={`text-sm ${notification.read ? "text-gray-400" : "text-white"}`}>
                    {getNotificationMessage(notification)}
                  </p>
                  <span className="block text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</span>
                </div>
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.preventDefault() // Prevent the parent div's onClick from triggering
                      e.stopPropagation() // Prevent the parent div's onClick from triggering
                      markAsRead(notification.id)
                    }}
                    className="ml-4 flex-shrink-0 text-purple-400 hover:text-purple-300 text-sm font-medium"
                    title="Mark as read"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
