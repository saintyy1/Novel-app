"use client"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  applyActionCode,
  checkActionCode,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  writeBatch,
} from "firebase/firestore"
import { auth, db, googleProvider, actionCodeSettings } from "../firebase/config"
import { trackUserRegistration } from "../utils/Analytics-utils"

// Extend the Firebase User type with our custom properties
export interface ExtendedUser extends User {
  isAdmin?: boolean
  createdAt?: string
  updatedAt?: string
  disabled?: boolean
  bio?: string
  followers?: string[]
  following?: string[]
  instagramUrl?: string
  twitterUrl?: string
  supportLink?: string
  location?: string // Nigerian or International
  library?: string[]
  finishedReads?: string[]
  pendingEmail?: string | null // New property for pending email change
}

interface AuthContextType {
  currentUser: ExtendedUser | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  sendEmailVerificationLink: () => Promise<void>
  verifyEmail: (actionCode: string) => Promise<any>
  loading: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
  updateUserPhoto: (photoBase64: string | null) => Promise<void>
  updateUserProfile: (displayName: string, bio: string, instagramUrl: string, twitterUrl: string, supportLink: string, location: string) => Promise<void>
  toggleFollow: (targetUserId: string, isFollowing: boolean) => Promise<void>
  signInWithGoogle: () => Promise<void>
  updateUserLibrary: (novelId: string, add: boolean, novelTitle: string, novelAuthorId: string) => Promise<void>
  markNovelAsFinished: (novelId: string, novelTitle: string, novelAuthorId: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>
  clearAllNotifications: () => Promise<void>
  updateUserEmail: (newEmail: string, confirmEmail: string, password?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  return useContext(AuthContext)
}

// Map to store cooldown timers for rapid follow notifications (e.g., 5 seconds)
// Key: `${fromUserId}-${toUserId}`, Value: NodeJS.Timeout
const notificationCooldowns = new Map<string, NodeJS.Timeout>()

// Map to store the timestamp of the last unfollow action for a user pair (for 12-hour suppression)
// Key: `${fromUserId}-${toUserId}`, Value: timestamp (milliseconds)
const lastUnfollowTimestamps = new Map<string, number>()

const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000

// Add these helper functions outside the AuthProvider component, but within the file scope
const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000

const getNovelLikeCooldownKey = (userId: string, novelId: string) => `novel_like_cooldown_${userId}_${novelId}`
const getNovelAddedToLibraryCooldownKey = (userId: string, novelId: string) =>
  `novel_added_to_library_cooldown_${userId}_${novelId}`

const setNovelLikeCooldown = (userId: string, novelId: string) => {
  if (typeof window !== "undefined") {
    // Ensure localStorage is available
    localStorage.setItem(getNovelLikeCooldownKey(userId, novelId), Date.now().toString())
  }
}

const clearNovelLikeCooldown = (userId: string, novelId: string) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(getNovelLikeCooldownKey(userId, novelId))
  }
}

const checkNovelLikeCooldown = (userId: string, novelId: string): boolean => {
  if (typeof window === "undefined") return false // Cannot check cooldown on server
  const lastLikeTimestamp = localStorage.getItem(getNovelLikeCooldownKey(userId, novelId))
  if (!lastLikeTimestamp) return false // No cooldown set
  const now = Date.now()
  return now - Number(lastLikeTimestamp) < TWENTY_FOUR_HOURS_IN_MS
}

const setNovelAddedToLibraryCooldown = (userId: string, novelId: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(getNovelAddedToLibraryCooldownKey(userId, novelId), Date.now().toString())
  }
}

const clearNovelAddedToLibraryCooldown = (userId: string, novelId: string) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(getNovelAddedToLibraryCooldownKey(userId, novelId))
  }
}

const checkNovelAddedToLibraryCooldown = (userId: string, novelId: string): boolean => {
  if (typeof window === "undefined") return false
  const lastAddedTimestamp = localStorage.getItem(getNovelAddedToLibraryCooldownKey(userId, novelId))
  if (!lastAddedTimestamp) return false
  const now = Date.now()
  return now - Number(lastAddedTimestamp) < TWENTY_FOUR_HOURS_IN_MS
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  // Keep reference to the original Firebase user for auth operations
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)

  const fetchUserData = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        // Extend the Firebase user with Firestore data
        const extendedUser = {
          ...user,
          isAdmin: data.isAdmin || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Always use Firestore photoURL, fallback to Firebase Auth photoURL
          photoURL: data.photoURL || user.photoURL,
          displayName: data.displayName || user.displayName || user.email?.split("@")[0] || "User",
          bio: data.bio || "", // New
          followers: data.followers || [], // New
          following: data.following || [], // New
          instagramUrl: data.instagramUrl || "", // New
          twitterUrl: data.twitterUrl || "", // New
          supportLink: data.supportLink || "", // New
          location: data.location || "", // New
          library: data.library || [], // New: Initialize library
          finishedReads: data.finishedReads || [], // Add this line
          pendingEmail: data.pendingEmail, // New property for pending email change
        } as ExtendedUser
        setCurrentUser(extendedUser)
        setFirebaseUser(user)
        setIsAdmin(data.isAdmin === true)
        return extendedUser
      } else {
        // Create user document if it doesn't exist
        const newUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL, // Keep original Firebase Auth photoURL if it exists
          isAdmin: false,
          createdAt: new Date().toISOString(),
          bio: "", // New: Initialize bio
          followers: [], // New
          following: [], // New
          instagramUrl: "", // New: Initialize social links
          twitterUrl: "", // New: Initialize social links
          supportLink: "", // New
          location: "", // New
          library: [], // New: Initialize library
          finishedReads: [], // Add this line
          pendingEmail: null, // New property for pending email change
        }
        await setDoc(doc(db, "users", user.uid), newUserData)
        const extendedUser = {
          ...user,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL,
          isAdmin: false,
          createdAt: newUserData.createdAt,
          bio: newUserData.bio, // New
          followers: newUserData.followers, // New
          following: newUserData.following, // New
          instagramUrl: newUserData.instagramUrl, // New
          twitterUrl: newUserData.twitterUrl, // New
          supportLink: "", // New: Initialize support link
          location: "", // New
          library: newUserData.library, // New
          finishedReads: newUserData.finishedReads, // Add this line
          pendingEmail: newUserData.pendingEmail, // New property for pending email change
        } as ExtendedUser
        setCurrentUser(extendedUser)
        setFirebaseUser(user)
        setIsAdmin(false)
        return extendedUser
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setIsAdmin(false)
      // Still set the basic user even if Firestore fails
      setCurrentUser(user as ExtendedUser)
      setFirebaseUser(user)
      return user
    }
  }

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser)
    }
  }

  const updateUserPhoto = async (photoBase64: string | null) => {
    if (!currentUser || !firebaseUser) throw new Error("No user logged in")
    try {
      // Only update Firestore - don't update Firebase Auth photoURL
      // because base64 strings are too long for Firebase Auth
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: photoBase64,
        updatedAt: new Date().toISOString(),
      })
      // Update local state immediately
      setCurrentUser((prev) => (prev ? { ...prev, photoURL: photoBase64 } : null))
    } catch (error) {
      console.error("Error updating user photo:", error)
      throw error
    }
  }

  // Updated function to update user's display name, bio, and social links
  const updateUserProfile = async (displayName: string, bio: string, instagramUrl: string, twitterUrl: string, supportLink: string, location: string) => {
    if (!currentUser || !firebaseUser) throw new Error("No user logged in")
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: displayName,
        bio: bio,
        instagramUrl: instagramUrl, // Save new social link
        twitterUrl: twitterUrl, // Save new social link
        supportLink: supportLink, // Save support link
        location: location, // Save location
        updatedAt: new Date().toISOString(),
      })
      // Update Firebase Auth display name if it changed
      if (firebaseUser.displayName !== displayName) {
        await updateProfile(firebaseUser, { displayName })
      }
      // Update authorName in all novels by this user if display name changed
      if (currentUser.displayName !== displayName) {
        const novelsRef = collection(db, "novels")
        const q = query(novelsRef, where("authorId", "==", currentUser.uid))
        const querySnapshot = await getDocs(q)
        for (const novelDoc of querySnapshot.docs) {
          const novelRef = doc(db, "novels", novelDoc.id)
          await updateDoc(novelRef, { authorName: displayName })
        }
      }
      // Update local state
      setCurrentUser((prev) => (prev ? { ...prev, displayName, bio, instagramUrl, twitterUrl, supportLink, location } : null))
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  }

  const updateUserEmail = async (newEmail: string, confirmEmail: string, password?: string) => {
    if (!currentUser) throw new Error("No user logged in")

    const authUser = auth.currentUser
    if (!authUser) throw new Error("No authenticated user")

    // Validate emails match
    if (newEmail !== confirmEmail) {
      throw new Error("Email addresses do not match")
    }

    // Validate email format
    if (!newEmail.includes("@")) {
      throw new Error("Please enter a valid email address")
    }

    // Check if new email is different from current
    if (newEmail === currentUser.email) {
      throw new Error("New email must be different from current email")
    }

    try {
      // Check if user is Google user
      const isGoogleUser = authUser.providerData.some((p) => p.providerId.includes("google"))

      if (isGoogleUser) {
        await reauthenticateWithPopup(authUser, googleProvider)
      } else {
        if (!password) {
          throw new Error("Password is required to change email")
        }
        if (!authUser.email) {
          throw new Error("Current user email not found")
        }
        // Use CURRENT email for reauthentication, not new email
        const credential = EmailAuthProvider.credential(authUser.email, password)
        await reauthenticateWithCredential(authUser, credential)
      }

      // Try to send the email change verification
      try {
        await verifyBeforeUpdateEmail(authUser, newEmail)
        console.log("Email change verification sent to new address")
      } catch (e) {
        console.error("Failed to send email change verification:", e)
        throw new Error("Could not send verification email to new address. Please check if the email address is valid and try again.")
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        pendingEmail: newEmail, // Store pending email change
        updatedAt: new Date().toISOString(),
      })

      // Don't update local state email yet - wait for verification
      setCurrentUser((prev) => (prev ? { ...prev, pendingEmail: newEmail } : null))
    } catch (error) {
      console.error("Error updating email:", error)
      if (error instanceof Error) {
        if (error.message.includes("operation-not-allowed")) {
          throw new Error("Email verification is required. Please check your email and click the verification link.")
        }
        if (error.message.includes("user-mismatch")) {
          throw new Error("Please use your current email and password for verification.")
        }
      }
      throw error
    }
  }

  // New function to toggle follow status
  const toggleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUser) throw new Error("No user logged in")
    if (currentUser.uid === targetUserId) throw new Error("Cannot follow yourself")

    const currentUserRef = doc(db, "users", currentUser.uid)
    const targetUserRef = doc(db, "users", targetUserId)
    const cooldownKey = `${currentUser.uid}-${targetUserId}`

    try {
      // Update current user's 'following' array
      await updateDoc(currentUserRef, {
        following: isCurrentlyFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId),
        updatedAt: new Date().toISOString(),
      })

      // Update target user's 'followers' array
      await updateDoc(targetUserRef, {
        followers: isCurrentlyFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        updatedAt: new Date().toISOString(),
      })

      // Logic for adding notification
      if (!isCurrentlyFollowing) {
        // User is now following (was not following before)
        const lastUnfollowTime = lastUnfollowTimestamps.get(cooldownKey)
        const currentTime = Date.now()

        // Check for re-follow within 12 hours
        if (lastUnfollowTime && currentTime - lastUnfollowTime < TWELVE_HOURS_IN_MS) {
          console.log("Follow notification suppressed due to re-follow within 12 hours:", cooldownKey)
          // Optionally, clear the unfollow timestamp if they re-followed within the window
          // This prevents the same unfollow from suppressing future notifications after the 12h window
          lastUnfollowTimestamps.delete(cooldownKey)
          return // Skip notification
        }

        // Check for rapid-click debounce (5 seconds)
        if (notificationCooldowns.has(cooldownKey)) {
          console.log("Follow notification debounced for rapid clicks:", cooldownKey)
          return // Skip if recently sent due to rapid clicks
        }

        // Set a rapid-click cooldown for this specific follow action
        const timeout = setTimeout(() => {
          notificationCooldowns.delete(cooldownKey)
        }, 5000) // 5 seconds cooldown
        notificationCooldowns.set(cooldownKey, timeout)

        // Add the actual follow notification
        await addDoc(collection(db, "notifications"), {
          toUserId: targetUserId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "follow",
          createdAt: new Date().toISOString(),
          read: false,
        })

        // Fetch and notify about existing announcements from the followed author
        const announcementsQuery = query(
          collection(db, "announcements"),
          where("authorId", "==", targetUserId),
          orderBy("createdAt", "desc"),
        )
        const announcementsSnapshot = await getDocs(announcementsQuery)

        for (const doc of announcementsSnapshot.docs) {
          const announcementData = doc.data()
          await addDoc(collection(db, "notifications"), {
            toUserId: currentUser.uid, // Notification for the follower
            fromUserId: targetUserId, // From the author
            fromUserName: announcementData.authorName || "Author", // Use author's name from announcement or default
            type: "followed_author_announcement", // New notification type
            announcementContent: announcementData.content,
            createdAt: new Date().toISOString(),
            read: false,
          })
        }

        // Clear unfollow timestamp after a successful follow (if a notification was sent)
        lastUnfollowTimestamps.delete(cooldownKey)
      } else {
        // User is now unfollowing (was following before)
        // Record the unfollow timestamp
        lastUnfollowTimestamps.set(cooldownKey, Date.now())
      }

      // Refresh current user's data to reflect changes
      await refreshUser()
    } catch (error) {
      console.error("Error toggling follow status:", error)
      // Clear cooldowns if an error occurred during the notification attempt
      if (notificationCooldowns.has(cooldownKey)) {
        clearTimeout(notificationCooldowns.get(cooldownKey)!)
        notificationCooldowns.delete(cooldownKey)
      }
      // Do NOT clear lastUnfollowTimestamps here, as the unfollow might have succeeded
      throw error
    }
  }

  // New function to update user's library
  const updateUserLibrary = async (novelId: string, add: boolean, novelTitle: string, novelAuthorId: string) => {
    if (!currentUser) throw new Error("No user logged in")
    const userRef = doc(db, "users", currentUser.uid)
    try {
      await updateDoc(userRef, {
        library: add ? arrayUnion(novelId) : arrayRemove(novelId),
        updatedAt: new Date().toISOString(),
      })
      // Update local state
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              library: add ? [...(prev.library || []), novelId] : (prev.library || []).filter((id) => id !== novelId),
            }
          : null,
      )

      // Handle novel_like notification and cooldown
      if (add && novelAuthorId !== currentUser.uid) {
        if (!checkNovelLikeCooldown(currentUser.uid, novelId)) {
          await addDoc(collection(db, "notifications"), {
            toUserId: novelAuthorId,
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || "Anonymous User",
            type: "novel_like",
            novelId: novelId,
            novelTitle: novelTitle,
            createdAt: new Date().toISOString(),
            read: false,
          })
          setNovelLikeCooldown(currentUser.uid, novelId)
        } else {
          console.log(`Novel like notification suppressed for ${currentUser.uid} on novel ${novelId} due to cooldown.`)
        }

        // Handle novel_added_to_library notification and cooldown
        if (!checkNovelAddedToLibraryCooldown(currentUser.uid, novelId)) {
          await addDoc(collection(db, "notifications"), {
            toUserId: novelAuthorId,
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || "Anonymous User",
            type: "novel_added_to_library", // New notification type
            novelId: novelId,
            novelTitle: novelTitle,
            createdAt: new Date().toISOString(),
            read: false,
          })
          setNovelAddedToLibraryCooldown(currentUser.uid, novelId)
        } else {
          console.log(
            `Novel added to library notification suppressed for ${currentUser.uid} on novel ${novelId} due to cooldown.`,
          )
        }
      } else if (!add) {
        // If unliking, clear the cooldown to allow a new notification on re-like
        clearNovelLikeCooldown(currentUser.uid, novelId)
        clearNovelAddedToLibraryCooldown(currentUser.uid, novelId) // Also clear for added to library
      }
    } catch (error) {
      console.error("Error updating user library:", error)
      throw error
    }
  }

  const markNovelAsFinished = async (novelId: string, novelTitle: string, novelAuthorId: string) => {
    if (!currentUser) throw new Error("No user logged in")
    const userRef = doc(db, "users", currentUser.uid)
    try {
      const isCurrentlyFinished = currentUser.finishedReads?.includes(novelId) || false

      if (!isCurrentlyFinished) {
        if (novelAuthorId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            toUserId: novelAuthorId,
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || "Anonymous User",
            type: "novel_finished",
            novelId: novelId,
            novelTitle: novelTitle,
            createdAt: new Date().toISOString(),
            read: false,
          })
        }
        await updateDoc(userRef, {
          finishedReads: arrayUnion(novelId),
          library: arrayRemove(novelId), // Remove from currently reading
          updatedAt: new Date().toISOString(),
        })
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                finishedReads: [...(prev.finishedReads || []), novelId],
                library: (prev.library || []).filter((id) => id !== novelId), // Remove from library
              }
            : null,
        )
      } else {
        await updateDoc(userRef, {
          finishedReads: arrayRemove(novelId),
          library: arrayUnion(novelId), // Add back to currently reading
          updatedAt: new Date().toISOString(),
        })
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                finishedReads: (prev.finishedReads || []).filter((id) => id !== novelId),
                library: [...(prev.library || []), novelId], // Add back to library
              }
            : null,
        )
      }
    } catch (error) {
      console.error("Error toggling novel finished status:", error)
      throw error
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Track registration immediately after user creation
    trackUserRegistration(user.uid, "email")

    // Update the user's display name in Firebase Auth
    await updateProfile(user, {
      displayName: displayName,
    })

    // Send email verification
    await sendEmailVerification(user, actionCodeSettings)

    // Create user document in Firestore
    const newUserData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: null, // Start with no photo
      isAdmin: false,
      createdAt: new Date().toISOString(),
      bio: "", // New: Initialize bio
      followers: [], // New
      following: [], // New
      instagramUrl: "", // New: Initialize social links
      twitterUrl: "", // New: Initialize social links
      supportLink: "", // New
      location: "", // New
      library: [], // New: Initialize library
      finishedReads: [], // Add this line
      pendingEmail: null, // New property for pending email change
    }
    await setDoc(doc(db, "users", user.uid), newUserData)
    // Set extended user
    const extendedUser: ExtendedUser = {
      ...user,
      displayName: displayName,
      photoURL: null,
      isAdmin: false,
      createdAt: newUserData.createdAt,
      bio: newUserData.bio, // New
      followers: newUserData.followers, // New
      following: newUserData.following, // New
      instagramUrl: newUserData.instagramUrl, // New
      twitterUrl: newUserData.twitterUrl, // New
      supportLink: newUserData.supportLink, // New
      location: newUserData.location, // New
      library: newUserData.library, // New
      finishedReads: newUserData.finishedReads, // Add this line
      pendingEmail: newUserData.pendingEmail, // New property for pending email change
    }
    setCurrentUser(extendedUser)
    setFirebaseUser(user)
  }

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
    setIsAdmin(false)
    setCurrentUser(null)
    setFirebaseUser(null)
    // Clear all active cooldowns and unfollow timestamps on logout
    notificationCooldowns.forEach((timeout) => clearTimeout(timeout))
    notificationCooldowns.clear()
    lastUnfollowTimestamps.clear()
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const sendEmailVerificationLink = async () => {
    if (!firebaseUser) throw new Error("No user logged in")
    await sendEmailVerification(firebaseUser, actionCodeSettings)
  }

  const verifyEmail = async (actionCode: string) => {
    try {
      // Verify the action code
      const info = await checkActionCode(auth, actionCode)
      
      // Apply the action code
      await applyActionCode(auth, actionCode)
      
      // Refresh the user to get updated email verification status
      if (firebaseUser) {
        await firebaseUser.reload()
        await fetchUserData(firebaseUser)
      }
      
      return info
    } catch (error) {
      console.error("Error verifying email:", error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      // Check if user document exists
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        const newUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: null,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          bio: "", // New: Initialize bio
          followers: [], // New
          following: [], // New
          instagramUrl: "", // New: Initialize social links
          twitterUrl: "", // New: Initialize social links
          supportLink: "", // New
          location: "", // New
          library: [], // New: Initialize library
          finishedReads: [], // Add this line
          pendingEmail: null, // New property for pending email change
        }
        await setDoc(doc(db, "users", user.uid), newUserData)
      }
      // Fetch user data to update context
      await fetchUserData(user)
    } catch (error) {
      console.error("Error signing in with Google:", error)
      throw error
    }
  }

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return

    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid),
        where("read", "==", false),
      )

      const snapshot = await getDocs(notificationsQuery)
      const batch = writeBatch(db)

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true })
      })

      await batch.commit()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw error
    }
  }

  const clearAllNotifications = async () => {
    if (!currentUser) return

    try {
      const notificationsQuery = query(collection(db, "notifications"), where("toUserId", "==", currentUser.uid))

      const snapshot = await getDocs(notificationsQuery)
      const batch = writeBatch(db)

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
    } catch (error) {
      console.error("Error clearing all notifications:", error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user)
      } else {
        setIsAdmin(false)
        setCurrentUser(null)
        setFirebaseUser(null)
        // Clear all active cooldowns and unfollow timestamps on auth state change (e.g., logout)
        notificationCooldowns.forEach((timeout) => clearTimeout(timeout))
        notificationCooldowns.clear()
        lastUnfollowTimestamps.clear()
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = {
    currentUser,
    login,
    register,
    logout,
    resetPassword,
    sendEmailVerificationLink,
    verifyEmail,
    loading,
    isAdmin,
    refreshUser,
    updateUserPhoto,
    updateUserProfile,
    toggleFollow,
    signInWithGoogle,
    updateUserLibrary,
    markNovelAsFinished,
    markAllNotificationsAsRead,
    clearAllNotifications,
    updateUserEmail,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
