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
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../firebase/config"

// Extend the Firebase User type with our custom properties
interface ExtendedUser extends User {
  isAdmin?: boolean
  createdAt?: string
  updatedAt?: string
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
          displayName: data.displayName || user.displayName,
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
          displayName: user.displayName,
          photoURL: user.photoURL, // Keep original Firebase Auth photoURL if it exists
          isAdmin: false,
          createdAt: new Date().toISOString(),
        }

        await setDoc(doc(db, "users", user.uid), newUserData)

        const extendedUser: ExtendedUser = {
          ...user,
          isAdmin: false,
          createdAt: newUserData.createdAt,
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
    }

    await setDoc(doc(db, "users", user.uid), newUserData)

    // Set extended user
    const extendedUser: ExtendedUser = {
      ...user,
      displayName: displayName,
      photoURL: null,
      isAdmin: false,
      createdAt: newUserData.createdAt,
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
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
