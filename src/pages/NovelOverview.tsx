"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
} from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import { FaShare, FaCopy, FaFacebook, FaTwitter, FaWhatsapp, FaTimes } from "react-icons/fa"

interface Comment {
  id: string
  userId: string
  userName: string
  userPhoto?: string
  content: string
  createdAt: string
  likes: number
  likedBy: string[]
}

const NovelOverview = () => {
  const { id } = useParams<{ id: string }>()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [commentsLoading, setCommentsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [liked, setLiked] = useState<boolean>(false)
  const [newComment, setNewComment] = useState<string>("")
  const [submittingComment, setSubmittingComment] = useState<boolean>(false)
  const [showShareModal, setShowShareModal] = useState<boolean>(false)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchNovel = async () => {
      if (!id) return

      try {
        setLoading(true)
        const novelDoc = await getDoc(doc(db, "novels", id))

        if (novelDoc.exists()) {
          const novelData = novelDoc.data()

          // Check if current user has liked this novel
          if (currentUser && novelData.likedBy && novelData.likedBy.includes(currentUser.uid)) {
            setLiked(true)
          }

          setNovel({
            id: novelDoc.id,
            ...novelData,
          } as Novel)

          // Increment view count
          await updateDoc(doc(db, "novels", id), {
            views: increment(1),
          })
        } else {
          setError("Novel not found")
        }
      } catch (error) {
        console.error("Error fetching novel:", error)
        setError("Failed to load novel")
      } finally {
        setLoading(false)
      }
    }

    fetchNovel()
  }, [id, currentUser])

  useEffect(() => {
    if (!id) return

    const commentsQuery = query(collection(db, "comments"), where("novelId", "==", id), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData: Comment[] = []
      snapshot.forEach((doc) => {
        commentsData.push({
          id: doc.id,
          ...doc.data(),
        } as Comment)
      })
      setComments(commentsData)
      setCommentsLoading(false)
    })

    return () => unsubscribe()
  }, [id])

  const handleLike = async () => {
    if (!novel || !currentUser) return

    try {
      const newLikeStatus = !liked
      setLiked(newLikeStatus)

      const novelRef = doc(db, "novels", novel.id)

      if (newLikeStatus) {
        await updateDoc(novelRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid),
        })
      } else {
        await updateDoc(novelRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid),
        })
      }

      setNovel((prev) => {
        if (!prev) return null
        return {
          ...prev,
          likes: (prev.likes || 0) + (newLikeStatus ? 1 : -1),
        }
      })
    } catch (error) {
      console.error("Error updating likes:", error)
      setLiked(!liked)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser || !novel) return

    try {
      setSubmittingComment(true)
      await addDoc(collection(db, "comments"), {
        novelId: novel.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || null,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
      })
      setNewComment("")
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!currentUser) return

    try {
      const commentRef = doc(db, "comments", commentId)
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid),
        })
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid),
        })
      }
    } catch (error) {
      console.error("Error updating comment like:", error)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const handleCopyLink = async () => {
    const novelUrl = `${window.location.origin}/novel/${novel?.id}`
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
    if (!novel) return

    const novelUrl = `${window.location.origin}/novel/${novel.id}`
    const shareText = `Check out "${novel.title}" by ${novel.authorName} on NovelNest!`

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
      const appWindow = window.open(shareUrl, '_blank')
      
      // If app window failed to open (app not installed), fallback to web version
      if (!appWindow || appWindow.closed || typeof appWindow.closed === 'undefined') {
        setTimeout(() => {
          switch (platform) {
            case "facebook":
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(novelUrl)}`, '_blank')
              break
            case "whatsapp":
              window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${novelUrl}`)}`, '_blank')
              break
          }
        }, 1000)
      }
    } else {
      // For desktop, open in a popup window
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !novel) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 rounded-xl shadow-md p-8 max-w-md text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-white">Novel Not Found</h3>
          <p className="mt-2 text-gray-400">{error || "The novel you're looking for doesn't exist."}</p>
          <Link to="/novels" className="mt-6 inline-flex items-center text-sm text-purple-400 hover:text-purple-300">
            ← Go Back to Browse
          </Link>
        </div>
      </div>
    )
  }

  const isAuthor = currentUser && novel.authorId === currentUser.uid

  return (
    <div className="min-h-screen bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        {/* Header */}
        <div>
          <Link
            to="/novels"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 my-4 transition-colors text-sm sm:text-base"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Browse
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Side - Novel Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* Novel Header */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Cover Image */}
                <div className="w-full md:w-1/3 md:h-auto relative bg-[#070707] sm:h-[400px]">
                  {novel.coverImage ? (
                    <img
                      src={novel.coverImage || "/placeholder.svg"}
                      alt={novel.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                      <svg className="h-16 w-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Novel Info */}
                <div className="w-full md:w-2/3 p-4 sm:p-6 md:p-8">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">{novel.title}</h1>
                  <p className="text-sm sm:text-lg text-gray-300 mb-3 sm:mb-4">{novel.description}</p>
                  <p className="mb-3 sm:mb-4 text-sm text-gray-200">
                    By{" "}
                    <Link
                      to={`/profile/${novel.authorId}`}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {novel.authorName}
                    </Link>
                  </p>

                  {/* Genres */}
                  <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    {novel.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <button
                      onClick={handleLike}
                      disabled={!currentUser}
                      className={`flex items-center transition-colors ${
                        !currentUser ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"
                      } ${liked ? "text-red-400" : "text-gray-300 hover:text-red-400"}`}
                    >
                      <svg
                        className={`h-5 w-5 mr-2 transition-colors ${liked ? "fill-current text-red-400" : ""}`}
                        fill={liked ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {novel.likes || 0}
                    </button>
                    <div className="flex items-center text-gray-300">
                      <svg className="h-5 w-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {novel.views || 0}
                    </div>
                    <div className="flex items-center text-gray-300">
                      <svg
                        className="h-5 w-5 mr-2 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {novel.chapters?.length || 0}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Link
                      to={`/novel/${novel.id}/read`}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      Start Reading
                    </Link>

                    <button
                      onClick={handleShare}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 transform hover:scale-105"
                    >
                      <FaShare className="h-4 w-4 mr-2" />
                      Share
                    </button>

                    {isAuthor && (
                      <Link
                        to={`/novel/${novel.id}/add-chapters`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30"
                      >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Add Chapters
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center">
                <svg className="h-6 w-6 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Summary
              </h2>
              <p className="text-gray-300 leading-relaxed text-base sm:text-lg">{novel.summary}</p>
            </div>

            {/* Chapters List */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <svg className="h-6 w-6 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Chapters ({novel.chapters?.length || 0})
              </h2>
              <div className="space-y-3">
                {novel.chapters?.map((chapter, index) => (
                  <Link
                    key={index}
                    to={`/novel/${novel.id}/read?chapter=${index}`}
                    className="block p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors">
                          Chapter {index + 1}: {chapter.title}
                        </h3>
                      </div>
                      <svg
                        className="h-5 w-5 text-gray-400 group-hover:text-purple-300 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )) || (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No chapters available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Comments */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                <svg className="h-5 w-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Comments ({comments.length})
              </h2>

              {/* Comment Form */}
              {currentUser ? (
                <form onSubmit={handleCommentSubmit} className="mb-4 sm:mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL || "/placeholder.svg"}
                          alt="Your avatar"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getUserInitials(currentUser.displayName || "User")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts about this novel..."
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || submittingComment}
                        className="mt-2 inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {submittingComment ? (
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
                          "Post Comment"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-gray-400 text-sm mb-2">Sign in to leave a comment</p>
                  <Link to="/login" className="inline-flex items-center text-purple-400 hover:text-purple-300 text-sm">
                    Sign In →
                  </Link>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3 sm:space-y-4 max-h-[50vh] lg:max-h-96 overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="text-gray-400 text-sm">No comments yet</p>
                    <p className="text-gray-500 text-xs mt-1">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {comment.userPhoto ? (
                            <img
                              src={comment.userPhoto || "/placeholder.svg"}
                              alt={comment.userName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {getUserInitials(comment.userName)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white text-sm font-semibold">{comment.userName}</h4>
                            <span className="text-gray-400 text-xs">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed mb-2">{comment.content}</p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleCommentLike(comment.id, comment.likedBy?.includes(currentUser?.uid || ""))
                              }
                              disabled={!currentUser}
                              className={`inline-flex items-center text-xs ${
                                comment.likedBy?.includes(currentUser?.uid || "")
                                  ? "text-red-400"
                                  : "text-gray-400 hover:text-red-400"
                              } transition-colors ${!currentUser ? "cursor-not-allowed" : ""}`}
                            >
                              <svg
                                className={`h-4 w-4 mr-1 ${comment.likedBy?.includes(currentUser?.uid || "") ? "fill-current" : ""}`}
                                fill={comment.likedBy?.includes(currentUser?.uid || "") ? "currentColor" : "none"}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                              {comment.likes || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-0 border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Share Novel</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Copy Link */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 mb-1">Share Link</p>
                    <p className="text-xs text-gray-400 break-all">{`${window.location.origin}/novel/${novel.id}`}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copySuccess ? "bg-green-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
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
                    <FaTwitter className="h-6 w-6 text-white" />
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
    </div>
  )
}

export default NovelOverview
