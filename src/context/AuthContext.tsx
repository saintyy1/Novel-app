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
  signInWithPopup,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore" // Import arrayUnion and arrayRemove, and new Firestore functions
import { auth, db, googleProvider } from "../firebase/config"

// Extend the Firebase User type with our custom properties
export interface ExtendedUser extends User {
  isAdmin?: boolean
  createdAt?: string
  updatedAt?: string
  disabled?: boolean
  bio?: string // New: User's biography
  followers?: string[] // New: UIDs of users following this user
  following?: string[] // New: UIDs of users this user is following
  instagramUrl?: string // New: Instagram profile URL
  twitterUrl?: string // New: TikTok profile URL
}

interface AuthContextType {
  currentUser: ExtendedUser | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  loading: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
  updateUserPhoto: (photoBase64: string | null) => Promise<void>
  updateUserProfile: (displayName: string, bio: string, instagramUrl: string, twitterUrl: string) => Promise<void> // Updated signature
  toggleFollow: (targetUserId: string, isFollowing: boolean) => Promise<void> // New
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  return useContext(AuthContext)
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
        const extendedUser: ExtendedUser = {
          ...user,
          isAdmin: data.isAdmin || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Always use Firestore photoURL, fallback to Firebase Auth photoURL
          photoURL: data.photoURL || user.photoURL,
          displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'User',
          bio: data.bio || '', // New
          followers: data.followers || [], // New
          following: data.following || [], // New
          instagramUrl: data.instagramUrl || '', // New
          twitterUrl: data.twitterUrl || '', // New
        }
        setCurrentUser(extendedUser)
        setFirebaseUser(user)
        setIsAdmin(data.isAdmin === true)
        return extendedUser
      } else {
        // Create user document if it doesn't exist
        const newUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL, // Keep original Firebase Auth photoURL if it exists
          isAdmin: false,
          createdAt: new Date().toISOString(),
          bio: '', // New: Initialize bio
          followers: [], // New: Initialize followers
          following: [], // New: Initialize following
          instagramUrl: '', // New: Initialize social links
          twitterUrl: '', // New: Initialize social links
        }
        await setDoc(doc(db, "users", user.uid), newUserData)
        const extendedUser: ExtendedUser = {
          ...user,
          isAdmin: false,
          createdAt: newUserData.createdAt,
          displayName: newUserData.displayName,
          photoURL: newUserData.photoURL,
          bio: newUserData.bio, // New
          followers: newUserData.followers, // New
          following: newUserData.following, // New
          instagramUrl: newUserData.instagramUrl, // New
          twitterUrl: newUserData.twitterUrl // New
        }
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
  const updateUserProfile = async (displayName: string, bio: string, instagramUrl: string, twitterUrl: string) => {
    if (!currentUser || !firebaseUser) throw new Error("No user logged in")
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: displayName,
        bio: bio,
        instagramUrl: instagramUrl, // Save new social link
        twitterUrl: twitterUrl, // Save new social link
        updatedAt: new Date().toISOString(),
      })
      // Update Firebase Auth display name if it changed
      if (firebaseUser.displayName !== displayName) {
        await updateProfile(firebaseUser, { displayName })
      }

      // Update authorName in all novels by this user
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
      setCurrentUser((prev) => (prev ? { ...prev, displayName, bio, instagramUrl, twitterUrl } : null))
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  }

  // New function to toggle follow status
  const toggleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUser) throw new Error("No user logged in")
    if (currentUser.uid === targetUserId) throw new Error("Cannot follow yourself")

    const currentUserRef = doc(db, "users", currentUser.uid)
    const targetUserRef = doc(db, "users", targetUserId)

    try {
      // Update current user's 'following' array
      await updateDoc(currentUserRef, {
        following: isCurrentlyFollowing
          ? arrayRemove(targetUserId)
          : arrayUnion(targetUserId),
        updatedAt: new Date().toISOString(),
      })

      // Update target user's 'followers' array
      await updateDoc(targetUserRef, {
        followers: isCurrentlyFollowing
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
        updatedAt: new Date().toISOString(),
      })

      // Refresh current user's data to reflect changes
      await refreshUser()
    } catch (error) {
      console.error("Error toggling follow status:", error)
      throw error
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    // Update the user's display name in Firebase Auth
    await updateProfile(user, {
      displayName: displayName,
    })
    // Create user document in Firestore
    const newUserData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: null, // Start with no photo
      isAdmin: false,
      createdAt: new Date().toISOString(),
      bio: '', // New: Initialize bio
      followers: [], // New: Initialize followers
      following: [], // New: Initialize following
      instagramUrl: '', // New: Initialize social links
      twitterUrl: '', // New: Initialize social links
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
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
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
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: null,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          bio: '', // New: Initialize bio
          followers: [], // New: Initialize followers
          following: [], // New: Initialize following
          instagramUrl: '', // New: Initialize social links
          twitterUrl: '', // New: Initialize social links
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user)
      } else {
        setIsAdmin(false)
        setCurrentUser(null)
        setFirebaseUser(null)
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
    loading,
    isAdmin,
    refreshUser,
    updateUserPhoto,
    updateUserProfile, // New
    toggleFollow, // New
    signInWithGoogle,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
