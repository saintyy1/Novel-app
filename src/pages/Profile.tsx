"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import type { ExtendedUser } from "../context/AuthContext"

const Profile = () => {
  const { userId } = useParams()
  const { currentUser, updateUserPhoto } = useAuth()
  const [profileUser, setProfileUser] = useState<ExtendedUser | null>(null)
  const [userNovels, setUserNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"published" | "pending" | "all">("all")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  const isOwnProfile = !userId || userId === currentUser?.uid

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser && !userId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError("")

        // If viewing another user's profile, fetch their data
        if (userId && userId !== currentUser?.uid) {
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            setProfileUser({ uid: userDoc.id, ...userDoc.data() } as ExtendedUser)
          } else {
            setError("User not found")
            return
          }
        } else {
          // Viewing own profile
          setProfileUser(currentUser)
        }

        // Fetch novels for the profile user
        const targetUserId = userId || currentUser?.uid
        if (targetUserId) {
          const novelsQuery = query(
            collection(db, "novels"),
            where("authorId", "==", targetUserId),
            orderBy("createdAt", "desc")
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
  }, [currentUser, userId])


  const resizeImage = (file: File, maxWidth = 200, maxHeight = 200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const img = new Image()

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
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit for original file
      setPhotoError("Profile picture must be less than 10MB")
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
  }

  const removeProfilePicture = async () => {
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
  }

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

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

  const getStatusBadge = (novel: Novel) => {
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
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>

                {profileUser?.photoURL && (
                  <button
                    onClick={removeProfilePicture}
                    disabled={uploadingPhoto}
                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove profile picture"
                  >
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
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
              <p className="text-gray-400 mt-1 break-all text-sm sm:text-base">
                {profileUser?.email}
              </p>

              {/* Photo Error/Success Message */}
              {isOwnProfile && photoError && (
                <div
                  className={`mt-2 text-xs sm:text-sm ${
                    photoError.includes("successfully")
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {photoError}
                </div>
              )}

              {/* Photo Upload Instructions */}
              <div className="mt-2 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center justify-center sm:justify-start">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span className="truncate">
                    {userNovels.length} Novel{userNovels.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-start">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="truncate">{userNovels.filter((novel) => novel.published).length} Published</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="truncate">{userNovels.filter((novel) => !novel.published).length} Pending</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="truncate">
                    {userNovels.reduce((total, novel) => total + (novel.likes || 0), 0)} Total Likes
                  </span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
            <div className="flex justify-center sm:justify-end w-full sm:w-auto">
              <Link
                to="/submit"
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                <svg
                  className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Submit New Novel</span>
                <span className="sm:hidden">New Novel</span>
              </Link>
            </div>
            )}
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
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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

        {/* Novels Section */}
        <div className="bg-gray-800 rounded-xl shadow-md">
          {/* Tab Navigation */}
          <div className="border-b border-gray-700">
            <nav className="flex space-x-4 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "all"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                All Novels ({userNovels.length})
              </button>
              <button
                onClick={() => setActiveTab("published")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "published"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Published ({userNovels.filter((novel) => novel.published).length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "pending"
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
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
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
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
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
                          src={novel.coverImage || "/placeholder.svg"}
                          alt={novel.title}
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
                    </div>

                    {/* Novel Content */}
                    <div className="p-6">
                      
                      <div className="text-xs text-gray-500 mb-4">Created: {formatDate(novel.createdAt)}</div>

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
                            <Link
                              to={`/novel/${novel.id}/add-chapters`}
                              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                            </Link>
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
    </div>
  )
}

export default Profile
