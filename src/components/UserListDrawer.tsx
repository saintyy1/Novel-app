"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore" // Removed unused imports
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { X, UserPlus, UserMinus } from 'lucide-react'

interface UserListDrawerProps {
  isOpen: boolean
  onClose: () => void
  userIds: string[]
  title: string
}

interface UserDisplayInfo {
  uid: string
  displayName: string
  photoURL: string | null
  isFollowing: boolean
}

const UserListDrawer: React.FC<UserListDrawerProps> = ({ isOpen, onClose, userIds, title }) => {
  const { currentUser, toggleFollow } = useAuth()
  const [usersToDisplay, setUsersToDisplay] = useState<UserDisplayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingFollowId, setTogglingFollowId] = useState<string | null>(null)

  const fetchUserDetails = useCallback(async () => {
    setLoading(true)
    const fetchedUsers: UserDisplayInfo[] = []
    const uniqueUserIds = Array.from(new Set(userIds)) // Ensure unique UIDs

    if (uniqueUserIds.length === 0) {
      setUsersToDisplay([])
      setLoading(false)
      return
    }

    try {
      // Fetch all user documents in parallel
      const userPromises = uniqueUserIds.map(async (uid) => {
        const userDocRef = doc(db, "users", uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          return {
            uid: userDocSnap.id,
            displayName: userData.displayName || "Anonymous",
            photoURL: userData.photoURL || null,
            isFollowing: currentUser?.following?.includes(userDocSnap.id) || false,
          }
        }
        return null
      })

      const results = await Promise.all(userPromises)
      setUsersToDisplay(results.filter(Boolean) as UserDisplayInfo[])
    } catch (error) {
      console.error("Error fetching user details for list:", error)
      // Handle error, maybe show a toast
    } finally {
      setLoading(false)
    }
  }, [userIds, currentUser?.following])

  useEffect(() => {
    if (isOpen) {
      fetchUserDetails()
    }
  }, [isOpen, fetchUserDetails])

  const handleToggleFollow = useCallback(
    async (targetUserId: string, currentIsFollowing: boolean) => {
      if (!currentUser) return

      setTogglingFollowId(targetUserId)
      try {
        await toggleFollow(targetUserId, currentIsFollowing)
        // Optimistically update the local state for the specific user
        setUsersToDisplay((prevUsers) =>
          prevUsers.map((user) =>
            user.uid === targetUserId ? { ...user, isFollowing: !currentIsFollowing } : user
          )
        )
      } catch (error) {
        console.error("Error toggling follow from list:", error)
        // Revert UI if error
        setUsersToDisplay((prevUsers) =>
          prevUsers.map((user) =>
            user.uid === targetUserId ? { ...user, isFollowing: currentIsFollowing } : user
          )
        )
      } finally {
        setTogglingFollowId(null)
      }
    },
    [currentUser, toggleFollow]
  )

  const getUserInitials = useCallback((name: string | null | undefined) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-gray-800 shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            className="p-2 rounded-md text-gray-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : usersToDisplay.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No users found.</div>
          ) : (
            <ul className="space-y-4">
              {usersToDisplay.map((user) => (
                <li key={user.uid} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                  <Link to={`/profile/${user.uid}`} className="flex items-center space-x-3 flex-grow" onClick={onClose}>
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL || "/placeholder.svg"} alt={user.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white text-lg font-bold">{getUserInitials(user.displayName)}</span>
                      )}
                    </div>
                    <span className="text-white font-medium truncate">{user.displayName}</span>
                  </Link>
                  {currentUser?.uid !== user.uid && (
                    <button
                      onClick={() => handleToggleFollow(user.uid, user.isFollowing)}
                      disabled={togglingFollowId === user.uid}
                      className={`ml-4 px-3 py-1 text-sm rounded-md flex items-center transition-colors ${
                        user.isFollowing
                          ? "bg-gray-600 hover:bg-gray-700 text-white"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      } ${togglingFollowId === user.uid ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {togglingFollowId === user.uid ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : user.isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" /> Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" /> Follow
                        </>
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserListDrawer
