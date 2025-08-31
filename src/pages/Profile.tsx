"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Link, useParams } from "react-router-dom"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore"
import { db, storage } from "../firebase/config"
import { ref, uploadBytes, deleteObject } from "firebase/storage"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import type { ExtendedUser } from "../context/AuthContext"
import EditProfileModal from "../components/EditProfileModal" // Import the new modal component
import UserListDrawer from "../components/UserListDrawer" // Import the new UserListDrawer
import { FaInstagram, FaTimes, FaFacebook, FaWhatsapp, FaCopy, FaShare } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import { Users, UserPlus, UserMinus, Megaphone, Plus, Trash2, Camera, X, Pencil } from "lucide-react" // Use Lucide icons

interface Announcement {
  id: string
  authorId: string
  content: string
  createdAt: string
}

const Profile = () => {
  const { userId } = useParams()
  const { currentUser, updateUserPhoto, toggleFollow } = useAuth()
  const [profileUser, setProfileUser] = useState<ExtendedUser | null>(null)
  const [userNovels, setUserNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true) // Initialize loading to true
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"published" | "pending" | "all">("all")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  // New state for novel cover management
  const [selectedNovelForCover, setSelectedNovelForCover] = useState<Novel | null>(null)
  const [showNovelCoverModal, setShowNovelCoverModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [uploadingNovelCover, setUploadingNovelCover] = useState(false)
  const [novelCoverError, setNovelCoverError] = useState("")
  const novelCoverFileInputRef = useRef<HTMLInputElement>(null)
  // States for follow feature
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  // New state for Edit Profile Modal
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  // New states for Announcement Board
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("")
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null)
  // New states for UserListDrawer
  const [showFollowListDrawer, setShowFollowListDrawer] = useState(false)
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null)
  const [displayedUserIds, setDisplayedUserIds] = useState<string[]>([])

  const isOwnProfile = !userId || userId === currentUser?.uid
  const displayName = profileUser?.displayName || currentUser?.displayName || "User"

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser && !userId) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError("")
        let fetchedUser: ExtendedUser | null = null
        // If viewing another user's profile, fetch their data
        if (userId && userId !== currentUser?.uid) {
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            fetchedUser = { uid: userDoc.id, ...userDoc.data() } as ExtendedUser
          } else {
            setError("User not found")
            return
          }
        } else {
          // Viewing own profile
          fetchedUser = currentUser
        }
        setProfileUser(fetchedUser)
        setFollowersCount(fetchedUser?.followers?.length || 0)
        setFollowingCount(fetchedUser?.following?.length || 0)
        if (currentUser && fetchedUser) {
          setIsFollowing(fetchedUser.followers?.includes(currentUser.uid) || false)
        } else {
          setIsFollowing(false)
        }

        // Fetch novels for the profile user
        const targetUserId = userId || currentUser?.uid
        if (targetUserId) {
          const novelsQuery = query(
            collection(db, "novels"),
            where("authorId", "==", targetUserId),
            orderBy("createdAt", "desc"),
          )
          const querySnapshot = await getDocs(novelsQuery)
          const novels: Novel[] = []
          querySnapshot.forEach((doc) => {
            novels.push({
              id: doc.id,
              ...doc.data(),
            } as Novel)
          })
          setUserNovels(novels)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [currentUser, userId]) // Re-run when currentUser or userId changes

  // Fetch announcements for the profile user
  useEffect(() => {
    if (!profileUser?.uid) return
    const announcementsQuery = query(
      collection(db, "announcements"),
      where("authorId", "==", profileUser.uid),
      orderBy("createdAt", "desc"),
    )
    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const fetchedAnnouncements: Announcement[] = []
        snapshot.forEach((doc) => {
          fetchedAnnouncements.push({ id: doc.id, ...doc.data() } as Announcement)
        })
        setAnnouncements(fetchedAnnouncements)
      },
      (error) => {
        console.error("Error fetching announcements:", error)
        showErrorToast("Failed to load announcements.")
      },
    )
    return () => unsubscribe()
  }, [profileUser?.uid])

  const refreshProfileUser = useCallback(async () => {
    if (!currentUser && !userId) {
      return
    }
    try {
      let fetchedUser: ExtendedUser | null = null
      if (userId && userId !== currentUser?.uid) {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          fetchedUser = { uid: userDoc.id, ...userDoc.data() } as ExtendedUser
        }
      } else {
        fetchedUser = currentUser
      }
      setProfileUser(fetchedUser)
      setFollowersCount(fetchedUser?.followers?.length || 0)
      setFollowingCount(fetchedUser?.following?.length || 0)
      if (currentUser && fetchedUser) {
        setIsFollowing(fetchedUser.followers?.includes(currentUser.uid) || false)
      } else {
        setIsFollowing(false)
      }
    } catch (err) {
      console.error("Error refreshing profile user data:", err)
      showErrorToast("Failed to refresh profile data.")
    }
  }, [currentUser, userId])

  // FOR PROFILE PICTURE UPLOAD AND RESIZE
  const resizeImage = useCallback((file: File, maxWidth = 200, maxHeight = 200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const img = new Image()
      img.crossOrigin = "anonymous" // Important for CORS issues [^1]
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        canvas.width = width
        canvas.height = height
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL("image/jpeg", quality)
        resolve(base64)
      }
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !currentUser) return

      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        // 10MB limit for original file
        setPhotoError("Profile picture must be less than 2MB")
        return
      }
      if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
        setPhotoError("Profile picture must be JPEG, PNG, or WebP format")
        return
      }

      try {
        setUploadingPhoto(true)
        setPhotoError("")
        // Resize and compress the image more aggressively for Firestore storage
        const resizedBase64 = await resizeImage(file, 200, 200, 0.7)

        // Check if the compressed image is reasonable size for Firestore
        // Firestore has a 1MB document limit, so we need to be conservative
        if (resizedBase64.length > 200000) {
          // ~150KB original size
          setPhotoError("Image is too large even after compression. Please use a smaller image.")
          return
        }

        // Update user photo in Firestore only
        await updateUserPhoto(resizedBase64)
        setPhotoError("Profile picture updated successfully!")
        // Clear success message after 3 seconds
        setTimeout(() => {
          setPhotoError("")
        }, 3000)
      } catch (err) {
        console.error("Error uploading profile picture:", err)
        setPhotoError("Failed to upload profile picture. Please try again.")
      } finally {
        setUploadingPhoto(false)
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [currentUser, resizeImage, updateUserPhoto],
  )

  const removeProfilePicture = useCallback(async () => {
    if (!currentUser) return
    try {
      setUploadingPhoto(true)
      setPhotoError("")
      // Remove photo from Firestore
      await updateUserPhoto(null)
      setPhotoError("Profile picture removed successfully!")
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPhotoError("")
      }, 3000)
    } catch (err) {
      console.error("Error removing profile picture:", err)
      setPhotoError("Failed to remove profile picture. Please try again.")
    } finally {
      setUploadingPhoto(false)
    }
  }, [currentUser, updateUserPhoto])

  // Resize image under 1MB
  async function resizeUnder1MB(file: File): Promise<Blob> {
    const maxBytes = 1 * 1024 * 1024
    const img = await loadImage(file)

    let quality = 0.9
    let width = img.width
    let height = img.height
    let blob: Blob | null = null

    do {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not supported")
      ctx.drawImage(img, 0, 0, width, height)

      const newBlob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), file.type, quality))

      if (newBlob.size > maxBytes) {
        if (quality > 0.5) {
          quality -= 0.05
        } else {
          width *= 0.9
          height *= 0.9
        }
      } else {
        blob = newBlob
        break
      }
    } while (true)

    return blob!
  }

  // Generate small thumbnail
  async function generateSmallBlob(file: File, maxWidth = 200, maxHeight = 300): Promise<Blob> {
    const img = await loadImage(file)

    let width = img.width
    let height = img.height

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width
        width = maxWidth
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height
        height = maxHeight
      }
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(img, 0, 0, width, height)

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.7))
  }

  // Load an image from file
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // New functions for novel cover management
  const handleNovelCoverUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !selectedNovelForCover) return

      if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
        setNovelCoverError("Cover image must be JPEG, PNG, or WebP format")
        return
      }

      try {
        setUploadingNovelCover(true)
        setNovelCoverError("")

        // Process images
        const resizedBlob = await resizeUnder1MB(file)
        const smallBlob = await generateSmallBlob(file)

        // Create Firebase Storage references
        const coverRef = ref(storage, `covers-large/${selectedNovelForCover.id}.jpg`)
        const coverSmallRef = ref(storage, `covers-small/${selectedNovelForCover.id}.jpg`)

        // Upload both versions
        await uploadBytes(coverRef, resizedBlob)
        await uploadBytes(coverSmallRef, smallBlob)

        // Generate the URLs
        const coverUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/covers-large/${selectedNovelForCover.id}.jpg`
        const coverSmallUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/covers-small/${selectedNovelForCover.id}.jpg`

        // Update Firestore document
        const novelRef = doc(db, "novels", selectedNovelForCover.id)
        await updateDoc(novelRef, {
          coverImage: coverUrl,
          coverSmallImage: coverSmallUrl
        })

        // Update local state
        setUserNovels(prevNovels =>
          prevNovels.map(novel =>
            novel.id === selectedNovelForCover.id
              ? { ...novel, coverImage: coverUrl, coverSmallImage: coverSmallUrl }
              : novel
          )
        )

        setSelectedNovelForCover(prev =>
          prev ? { ...prev, coverImage: coverUrl, coverSmallImage: coverSmallUrl } : null
        )

        setNovelCoverError("Novel cover updated successfully!")
        setTimeout(() => setNovelCoverError(""), 3000)
      } catch (err) {
        console.error("Error uploading novel cover:", err)
        setNovelCoverError("Failed to upload novel cover. Please try again.")
      } finally {
        setUploadingNovelCover(false)
        if (novelCoverFileInputRef.current) {
          novelCoverFileInputRef.current.value = ""
        }
      }
    },
    [selectedNovelForCover]
  )

  const removeNovelCover = useCallback(async () => {
    if (!selectedNovelForCover) return

    try {
      setUploadingNovelCover(true)
      setNovelCoverError("")

      // Delete from Firebase Storage
      const coverRef = ref(storage, `covers-large/${selectedNovelForCover.id}.jpg`)
      const coverSmallRef = ref(storage, `covers-small/${selectedNovelForCover.id}.jpg`)

      try {
        await Promise.all([
          deleteObject(coverRef),
          deleteObject(coverSmallRef)
        ])
      } catch (error) {
        console.log("Files may not exist in storage:", error)
      }

      // Update Firestore document
      const novelRef = doc(db, "novels", selectedNovelForCover.id)
      await updateDoc(novelRef, {
        coverImage: null,
        coverSmallImage: null
      })

      // Update local state
      setUserNovels(prevNovels =>
        prevNovels.map(novel =>
          novel.id === selectedNovelForCover.id
            ? { ...novel, coverImage: null, coverSmallImage: null }
            : novel
        )
      )

      setSelectedNovelForCover(prev =>
        prev ? { ...prev, coverImage: null, coverSmallImage: null } : null
      )

      setNovelCoverError("Novel cover removed successfully!")
      setTimeout(() => setNovelCoverError(""), 3000)
    } catch (err) {
      console.error("Error removing novel cover:", err)
      setNovelCoverError("Failed to remove novel cover. Please try again.")
    } finally {
      setUploadingNovelCover(false)
    }
  }, [selectedNovelForCover])

  const openNovelCoverModal = useCallback((novel: Novel) => {
    setSelectedNovelForCover(novel)
    setShowNovelCoverModal(true)
  }, [])

  const closeNovelCoverModal = useCallback(() => {
    setShowNovelCoverModal(false)
    setSelectedNovelForCover(null)
    setNovelCoverError("") // Clear any previous errors
  }, [])

  const handleCopyLink = async () => {
    const novelUrl = `${window.location.origin}/profile/${userId}`
    try {
      await navigator.clipboard.writeText(novelUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = novelUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleSocialShare = (platform: string) => {
    if (!userId) return
    const novelUrl = `${window.location.origin}/profile/${userId}`
    const shareText = `Follow ${displayName} on NovlNest!`
    let shareUrl = ""

    switch (platform) {
      case "facebook":
        // Use the Facebook app URL scheme for mobile
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          shareUrl = `fb://share?link=${encodeURIComponent(novelUrl)}`
        } else {
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(novelUrl)}`
        }
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(novelUrl)}`
        break
      case "whatsapp":
        // Use the WhatsApp app URL scheme for mobile
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          shareUrl = `whatsapp://send?text=${encodeURIComponent(`${shareText} ${novelUrl}`)}`
        } else {
          shareUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${novelUrl}`)}`
        }
        break
      default:
        return
    }

    // For mobile apps, try to open the app first, fallback to web if it fails
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const appWindow = window.open(shareUrl, "_blank")
      // If app window failed to open (app not installed), fallback to web version
      if (!appWindow || appWindow.closed || typeof appWindow.closed === "undefined") {
        setTimeout(() => {
          switch (platform) {
            case "facebook":
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(novelUrl)}`, "_blank")
              break
            case "whatsapp":
              window.open(
                `https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${novelUrl}`)}`,
                "_blank",
              )
              break
          }
        }, 1000)
      }
    } else {
      // For desktop, open in a popup window
      window.open(shareUrl, "_blank", "width=600,height=400")
    }
  }

  const handleShare = () => {
    setShowProfileModal(true)
  }

  const getUserInitials = useCallback((name: string | null | undefined) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }, [])

  const filteredNovels = userNovels.filter((novel) => {
    switch (activeTab) {
      case "published":
        return novel.published === true
      case "pending":
        return novel.published === false
      default:
        return true
    }
  })

  const getStatusBadge = useCallback((novel: Novel) => {
    if (novel.published) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
          Published
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400">
          Pending Review
        </span>
      )
    }
  }, [])

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const datePart = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    return `${datePart} ${timePart}`
  }, [])

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !profileUser || isOwnProfile) return

    const initialIsFollowing = isFollowing // Store initial state
    const initialFollowersCount = followersCount // Store initial count

    setIsTogglingFollow(true) // Set loading state
    try {
      await toggleFollow(profileUser.uid, initialIsFollowing) // Use initial state for the toggle logic

      // Optimistically update UI
      setIsFollowing((prev) => !prev)
      setFollowersCount((prev) => (initialIsFollowing ? prev - 1 : prev + 1))

      // Show toast notification for the follower
      if (!initialIsFollowing) {
        // Use initial state to determine toast message
        showSuccessToast(`You are now following ${profileUser.displayName || "this user"}!`)
      } else {
        showSuccessToast(`You have unfollowed ${profileUser.displayName || "this user"}.`)
      }

      // Refresh profile user data to ensure full synchronization
      await refreshProfileUser()
    } catch (err) {
      console.error("Error toggling follow:", err)
      showErrorToast("Failed to update follow status. Please try again.") // Show error toast
      // Revert UI if error
      setIsFollowing(initialIsFollowing) // Revert to initial state
      setFollowersCount(initialFollowersCount) // Revert to initial count
    } finally {
      setIsTogglingFollow(false) // Reset loading state
    }
  }, [currentUser, profileUser, isOwnProfile, isFollowing, followersCount, toggleFollow, refreshProfileUser])

  // Handle posting new announcement
  const handlePostAnnouncement = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newAnnouncementContent.trim() || !currentUser || !profileUser) return
      setSubmittingAnnouncement(true)
      try {
        const newAnnouncementRef = await addDoc(collection(db, "announcements"), {
          authorId: currentUser.uid,
          content: newAnnouncementContent.trim(),
          createdAt: new Date().toISOString(),
        })

        // Notify all followers of the current user (author)
        if (profileUser.followers && profileUser.followers.length > 0) {
          const notificationPromises = profileUser.followers.map((followerId) =>
            addDoc(collection(db, "notifications"), {
              toUserId: followerId,
              fromUserId: currentUser.uid,
              fromUserName: currentUser.displayName || "Author",
              type: "followed_author_announcement",
              announcementContent: newAnnouncementContent.trim(),
              createdAt: new Date().toISOString(),
              read: false,
            }),
          )
          await Promise.all(notificationPromises)
        }

        setNewAnnouncementContent("")
        showSuccessToast("Announcement posted!")
      } catch (error) {
        console.error("Error posting announcement:", error)
        showErrorToast("Failed to post announcement.")
      } finally {
        setSubmittingAnnouncement(false)
      }
    },
    [newAnnouncementContent, currentUser, profileUser],
  )

  // Handle deleting an announcement
  const handleDeleteAnnouncement = useCallback(
    async (announcementId: string) => {
      if (!currentUser || !isOwnProfile) return // Only author can delete
      if (!window.confirm("Are you sure you want to delete this announcement?")) return
      setDeletingAnnouncementId(announcementId)
      try {
        await deleteDoc(doc(db, "announcements", announcementId))
        showSuccessToast("Announcement deleted!")
      } catch (error) {
        console.error("Error deleting announcement:", error)
        showErrorToast("Failed to delete announcement.")
      } finally {
        setDeletingAnnouncementId(null)
      }
    },
    [currentUser, isOwnProfile],
  )

  // Handle showing followers/following list
  const handleShowFollowList = useCallback(
    (type: "followers" | "following") => {
      if (profileUser) {
        setFollowListType(type)
        setDisplayedUserIds(type === "followers" ? profileUser.followers || [] : profileUser.following || [])
        setShowFollowListDrawer(true)
      }
    },
    [profileUser],
  )

  const getFirebaseDownloadUrl = (url: string) => {
    if (!url || !url.includes("firebasestorage.app")) {
      return url
    }

    try {
      // Convert Firebase Storage URL to download URL format that bypasses CORS
      const urlParts = url.split("/")
      const bucketName = urlParts[3] // Extract bucket name
      const filePath = urlParts.slice(4).join("/") // Extract file path

      // Create download URL format that doesn't require CORS
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    } catch (error) {
      console.log(`[v0] Error converting Firebase URL: ${error}`)
      return url
    }
  }

  if (!currentUser && !userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your profile</h2>
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

  // Full-page loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture Section */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-purple-800 transition-all"
                onClick={() => profileUser?.photoURL && setShowPhotoModal(true)}
              >
                {profileUser?.photoURL ? (
                  <img
                    src={profileUser.photoURL || "/placeholder.svg"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) {
                        fallback.classList.remove("hidden")
                      }
                    }}
                  />
                ) : (
                  <span className="text-white text-lg sm:text-2xl font-bold">
                    {getUserInitials(profileUser?.displayName)}
                  </span>
                )}
                {profileUser?.photoURL && (
                  <span className="hidden text-white text-lg sm:text-2xl font-bold">
                    {getUserInitials(profileUser.displayName)}
                  </span>
                )}
              </div>
              {/* Upload/Remove Photo Buttons */}
              {isOwnProfile && (
                <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 flex space-x-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload profile picture"
                  >
                    {uploadingPhoto ? (
                      <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                  {profileUser?.photoURL && (
                    <button
                      onClick={removeProfilePicture}
                      disabled={uploadingPhoto}
                      className="bg-red-600 hover:bg-red-700 text-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove profile picture"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
              )}
              {/* Hidden file input */}
              {isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left w-full sm:ml-4 ml-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                {profileUser?.displayName || "User"}
              </h1>
              <p className="text-gray-400 mt-1 break-all text-sm sm:text-base">{profileUser?.email}</p>
              {/* Bio Section */}
              <div className="mt-4">
                <p className="text-gray-300 text-sm sm:text-base whitespace-pre-wrap">
                  {profileUser?.bio || (isOwnProfile ? "Add a short bio about yourself." : "No bio available.")}
                </p>
              </div>
              {/* Social Media Links */}
              <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
                {profileUser?.instagramUrl && (
                  <a
                    href={profileUser.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-400 transition-colors flex items-center text-sm"
                    title="Instagram Profile"
                  >
                    <FaInstagram className="h-5 w-5" />
                  </a>
                )}
                {profileUser?.twitterUrl && (
                  <a
                    href={profileUser.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-400 transition-colors flex items-center text-sm"
                    title="Twitter Profile"
                  >
                    <FaXTwitter className="h-5 w-5" />
                  </a>
                )}
              </div>
              {/* Photo Error/Success Message */}
              {isOwnProfile && photoError && (
                <div
                  className={`mt-2 text-xs sm:text-sm ${photoError.includes("successfully") ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {photoError}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-gray-200 justify-center sm:justify-start">
                <div className="flex items-center">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="truncate">
                    <span className="font-bold text-white">
                      {userNovels.reduce((total, novel) => total + (novel.likes || 0), 0)}
                    </span>{" "}
                    Likes
                  </span>
                </div>
                {/* Followers Count - Clickable */}
                <div
                  className="flex items-center cursor-pointer hover:text-gray-400 transition-all duration-200"
                  onClick={() => handleShowFollowList("followers")}
                >
                  <Users className="h-4 w-4 mr-1" />
                  <span className="truncate">
                    <span className="font-bold text-white">{followersCount} </span>
                    {followersCount === 1 ? "Follower" : "Followers"}
                  </span>
                </div>
                {/* Following Count - Clickable */}
                <div
                  className="flex items-center justify-center sm:justify-start cursor-pointer hover:text-gray-400 transition-all duration-200"
                  onClick={() => handleShowFollowList("following")}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  <span className="truncate">
                    <span className="font-bold text-white">{followingCount}</span> Following
                  </span>
                </div>
              </div>
            </div>
            {/* Action Buttons (Submit Novel / Follow / Edit Profile) */}
            <div className="flex flex-col sm:flex-col justify-center sm:justify-end w-full sm:w-auto gap-2">
              {isOwnProfile ? (
                <>
                  {/* New Novel Button always on top */}
                  <Link
                    to="/submit"
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Submit New Novel</span>
                    <span className="sm:hidden">New Novel</span>
                  </Link>
                  {/* Edit + Share below, side-by-side on mobile, stacked on sm+ */}
                  <div className="flex flex-row sm:flex-col gap-2">
                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="inline-flex items-center justify-center w-full px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      <Pencil className="h-4 w-4 mr-1 sm:mr-2" />
                      Edit Profile
                    </button>
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center justify-center px-3 w-full sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      <FaShare className="h-4 w-4 mr-2" />
                      Share Profile
                    </button>
                  </div>
                </>
              ) : (
                currentUser &&
                profileUser && (
                  <div className="flex flex-row justify-center sm:flex-col gap-2">
                    {/* Follow / Unfollow Button */}
                    <button
                      onClick={handleFollowToggle}
                      disabled={!currentUser || !profileUser || isTogglingFollow}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${isFollowing ? "bg-gray-600 hover:bg-gray-700" : "bg-purple-600 hover:bg-purple-700"
                        } ${isTogglingFollow ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isTogglingFollow ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {isFollowing ? "Unfollowing..." : "Following..."}
                        </>
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" /> Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" /> Follow
                        </>
                      )}
                    </button>
                    {/* Share Button next to Follow on mobile, stacked on sm+ */}
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      <FaShare className="h-4 w-4 mr-2" />
                      Share Profile
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Photo Modal */}
        {showPhotoModal && profileUser?.photoURL && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl max-h-full">
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="h-8 w-8" />
                <span className="sr-only">Close</span>
              </button>
              <img
                src={profileUser.photoURL || "/placeholder.svg"}
                alt="Profile Picture"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={() => setShowPhotoModal(false)}
              />
            </div>
          </div>
        )}

        {/* Announcements Section */}
        <div className="bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center">
            <Megaphone className="h-6 w-6 mr-2 text-purple-400" />
            Announcements
          </h2>
          {isOwnProfile && (
            <form onSubmit={handlePostAnnouncement} className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <textarea
                value={newAnnouncementContent}
                onChange={(e) => setNewAnnouncementContent(e.target.value)}
                placeholder="Post a new announcement for your followers..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={!newAnnouncementContent.trim() || submittingAnnouncement}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {submittingAnnouncement ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-2" />
                      Post Announcement
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No announcements yet.</p>
                {!isOwnProfile && <p className="text-sm mt-1">Follow this author to see their updates!</p>}
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 relative">
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                  <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                    <span>{formatDateTime(announcement.createdAt)}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        disabled={deletingAnnouncementId === announcement.id}
                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        title="Delete announcement"
                      >
                        {deletingAnnouncementId === announcement.id ? (
                          <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Novels Section */}
        <div className="bg-gray-800 rounded-xl shadow-md">
          {/* Tab Navigation */}
          <div className="border-b border-gray-700">
            <nav className="flex space-x-4 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "all"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
              >
                All Novels ({userNovels.length})
              </button>
              <button
                onClick={() => setActiveTab("published")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "published"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
              >
                Published ({userNovels.filter((novel) => novel.published).length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "pending"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
              >
                Pending Review ({userNovels.filter((novel) => !novel.published).length})
              </button>
            </nav>
          </div>
          {/* Content */}
          <div className="p-6">
            {error ? (
              <div className="text-center py-12">
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg">{error}</div>
              </div>
            ) : filteredNovels.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-white">
                  {activeTab === "all"
                    ? "No novels yet"
                    : activeTab === "published"
                      ? "No published novels"
                      : "No pending novels"}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  {activeTab === "all"
                    ? "Get started by submitting your first novel."
                    : activeTab === "published"
                      ? "Your published novels will appear here."
                      : "Novels awaiting review will appear here."}
                </p>
                {activeTab === "all" && isOwnProfile && (
                  <div className="mt-6">
                    <Link
                      to="/submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Your First Novel
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredNovels.map((novel) => (
                  <div
                    key={novel.id}
                    className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                  >
                    {/* Novel Cover/Header */}
                    <div className="relative h-48 bg-gradient-to-br from-purple-600/80 to-indigo-600/80 overflow-hidden">
                      {novel.coverImage ? (
                        <img
                          src={getFirebaseDownloadUrl(novel.coverImage || "/placeholder.svg")}
                          alt={novel.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="h-16 w-16 text-white/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4">{getStatusBadge(novel)}</div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{novel.title}</h3>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Prevent opening novel detail page
                            openNovelCoverModal(novel)
                          }}
                          className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full shadow-lg transition-colors z-10"
                          title="Edit novel cover"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Novel Content */}
                    <div className="p-6">
                      <div className="text-xs text-gray-500 mb-4">Created: {formatDateTime(novel.createdAt)}</div>
                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        {novel.published ? (
                          <>
                            <Link
                              to={`/novel/${novel.id}`}
                              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Link>
                            {isOwnProfile && (
                              <Link
                                to={`/novel/${novel.id}/add-chapters`}
                                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                              >
                                <Plus className="h-4 w-4" />
                              </Link>
                            )}
                          </>
                        ) : (
                          <div className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-amber-500/20 text-amber-300 font-medium rounded-lg border border-amber-500/30 cursor-not-allowed">
                            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Under Review
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-0 border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {isOwnProfile ? "My Profile" : `${profileUser?.displayName || "User"}'s Profile`}
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Copy Link */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex-1 inline-grid mr-3">
                    <p className="text-sm text-gray-300 mb-1">Share Link</p>
                    <p className="text-xs text-gray-400 truncate">{`${window.location.origin}/profile/${userId}`}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${copySuccess ? "bg-green-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                  >
                    <FaCopy className="h-4 w-4 mr-2" />
                    {copySuccess ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              {/* Social Media Buttons */}
              <div className="space-y-3">
                <p className="text-sm text-gray-300 font-medium">Share on social media</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSocialShare("facebook")}
                    className="flex flex-col items-center justify-center py-[0.5rem] bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <FaFacebook className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={() => handleSocialShare("twitter")}
                    className="flex flex-col items-center justify-center py-[0.5rem] bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
                  >
                    <FaXTwitter className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={() => handleSocialShare("whatsapp")}
                    className="flex flex-col items-center justify-center py-[0.5rem] bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <FaWhatsapp className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Novel Cover Modal */}
      {showNovelCoverModal && selectedNovelForCover && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-lg w-full relative">
            <button
              onClick={closeNovelCoverModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
              title="Close"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Edit Cover for "{selectedNovelForCover.title}"</h2>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-48 h-72 bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center overflow-hidden rounded-lg">
                {selectedNovelForCover.coverImage ? (
                  <img
                    src={getFirebaseDownloadUrl(selectedNovelForCover.coverImage || "/placeholder.svg")}
                    alt={selectedNovelForCover.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="h-24 w-24 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                )}
              </div>
              {isOwnProfile && (
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => novelCoverFileInputRef.current?.click()}
                    disabled={uploadingNovelCover}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingNovelCover ? (
                      <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <Camera className="h-5 w-5 mr-2" />
                    )}
                    Upload New Cover
                  </button>
                  {selectedNovelForCover.coverImage && (
                    <button
                      onClick={removeNovelCover}
                      disabled={uploadingNovelCover}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Remove Cover
                    </button>
                  )}
                </div>
              )}
              {novelCoverError && (
                <div
                  className={`mt-2 text-xs sm:text-sm ${novelCoverError.includes("successfully") ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {novelCoverError}
                </div>
              )}
              {isOwnProfile && (
                <input
                  ref={novelCoverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleNovelCoverUpload}
                  className="hidden"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && profileUser && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          profileUser={profileUser}
        />
      )}

      {/* User List Drawer */}
      {showFollowListDrawer && (
        <UserListDrawer
          isOpen={showFollowListDrawer}
          onClose={() => setShowFollowListDrawer(false)}
          userIds={displayedUserIds}
          title={followListType === "followers" ? "Followers" : "Following"}
        />
      )}
    </div>
  )
}

export default Profile
