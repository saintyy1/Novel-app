"use client"
import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
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
  deleteDoc,
  getDocs,
} from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Poem } from "../types/poem"
import { FaShare, FaCopy, FaFacebook, FaWhatsapp, FaTimes, FaReply, FaTrash } from "react-icons/fa"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import { FaXTwitter } from "react-icons/fa6"
import { Gift } from "lucide-react"
import SEOHead from "../components/SEOHead"
import SkeletonLoader from "../components/SkeletonLoader"

interface Comment {
  id: string
  userId: string
  userName: string
  userPhoto?: string
  content: string
  createdAt: string
  likes: number
  likedBy: string[]
  parentId?: string
  replies?: Comment[]
}

// Get poetry genre-based color gradients
const getPoemGenreColorClass = (genres: string[]) => {
  if (genres.includes("Romantic")) return "from-rose-500 to-pink-600"
  if (genres.includes("Nature")) return "from-emerald-500 to-teal-600"
  if (genres.includes("Free Verse")) return "from-purple-500 to-fuchsia-600"
  if (genres.includes("Haiku")) return "from-cyan-500 to-blue-600"
  if (genres.includes("Sonnet")) return "from-amber-500 to-orange-600"
  if (genres.includes("Epic")) return "from-red-600 to-rose-800"
  if (genres.includes("Lyric")) return "from-pink-400 to-rose-500"
  if (genres.includes("Narrative")) return "from-indigo-500 to-purple-600"
  if (genres.includes("Limerick")) return "from-yellow-400 to-amber-500"
  if (genres.includes("Ballad")) return "from-violet-500 to-purple-600"
  if (genres.includes("Elegy")) return "from-slate-600 to-gray-700"
  if (genres.includes("Ode")) return "from-orange-500 to-red-600"
  return "from-rose-600 to-pink-600" // Default poetry gradient
}

const PoemOverview = () => {
  const { id } = useParams<{ id: string }>()
  const [poem, setPoem] = useState<Poem | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [commentsLoading, setCommentsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [liked, setLiked] = useState<boolean>(false)
  const [newComment, setNewComment] = useState<string>("")
  const [submittingComment, setSubmittingComment] = useState<boolean>(false)
  const [showShareModal, setShowShareModal] = useState<boolean>(false)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<string>("")
  const [submittingReply, setSubmittingReply] = useState<boolean>(false)
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const [isTipModalOpen, setIsTipModalOpen] = useState(false)
  const [poetData, setPoetData] = useState<any>(null)
  const { currentUser, updatePoemLibrary } = useAuth()
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const replyInputRef = useRef<HTMLInputElement | null>(null)

  const buildCommentTree = useCallback((allComments: Comment[], parentId: string | null = null): Comment[] => {
    const children: Comment[] = []
    allComments.forEach((comment) => {
      if (comment.parentId === parentId) {
        const nestedReplies = buildCommentTree(allComments, comment.id)
        children.push({ ...comment, replies: nestedReplies })
      }
    })
    return children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [])

  // Fetch poet data for tip functionality
  useEffect(() => {
    const fetchPoetData = async () => {
      if (poem?.poetId) {
        try {
          const poetDoc = await getDoc(doc(db, "users", poem.poetId))
          if (poetDoc.exists()) {
            setPoetData(poetDoc.data())
          }
        } catch (error) {
          console.error("Error fetching poet data:", error)
        }
      }
    }

    fetchPoetData()
  }, [poem?.poetId])

  useEffect(() => {
    const fetchPoem = async () => {
      if (!id) return
      try {
        setLoading(true)
        setError("")
        const poemDocRef = doc(db, "poems", id)
        const poemDoc = await getDoc(poemDocRef)
        if (poemDoc.exists()) {
          const poemData = poemDoc.data() as Poem
          setPoem({
            ...poemData,
            id: poemDoc.id,
          } as Poem)
          if (currentUser && poemData.likedBy?.includes(currentUser.uid)) {
            setLiked(true)
          } else {
            setLiked(false)
          }
          // Handle view count increment for unique users
          if (currentUser) {
            const viewKey = `poem_view_${id}_${currentUser.uid}`
            const lastViewTimestamp = localStorage.getItem(viewKey)
            const now = Date.now()
            const twentyFourHours = 24 * 60 * 60 * 1000
            if (!lastViewTimestamp || now - Number(lastViewTimestamp) > twentyFourHours) {
              await updateDoc(poemDocRef, {
                views: increment(1),
              })
              localStorage.setItem(viewKey, now.toString())
              setPoem((prev) => (prev ? { ...prev, views: (prev.views || 0) + 1 } : null))
            }
          }
        } else {
          setError("Poem not found")
        }
      } catch (error) {
        console.error("Error fetching poem:", error)
        setError("Failed to load poem")
      } finally {
        setLoading(false)
      }
    }
    fetchPoem()
  }, [id, currentUser])

  useEffect(() => {
    if (!id) return
    
    // Delay comment fetching to prioritize main content loading
    const commentLoadDelay = setTimeout(() => {
      const commentsQuery = query(collection(db, "poemComments"), where("poemId", "==", id), orderBy("createdAt", "desc"))
      const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
        setCommentsLoading(true)
      const commentsData: Comment[] = []
      const uniqueUserIds = new Set<string>()
      snapshot.forEach((doc) => {
        const comment = { id: doc.id, ...doc.data() } as Comment
        commentsData.push(comment)
        uniqueUserIds.add(comment.userId)
      })
      const usersMap = new Map<string, { displayName: string; photoURL?: string }>()
      const userPromises = Array.from(uniqueUserIds).map(async (uid) => {
        const userDoc = await getDoc(doc(db, "users", uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          usersMap.set(uid, {
            displayName: userData.displayName || "Anonymous",
            photoURL: userData.photoURL || undefined,
          })
        } else {
          usersMap.set(uid, { displayName: "Deleted User", photoURL: undefined })
        }
      })
      await Promise.all(userPromises)
      const enrichedComments = commentsData.map((comment) => {
        const userData = usersMap.get(comment.userId)
        return {
          ...comment,
          userName: userData?.displayName || comment.userName,
          userPhoto: userData?.photoURL || comment.userPhoto,
        }
      })
      const topLevelComments = enrichedComments.filter((comment) => !comment.parentId)
      const organizedComments = topLevelComments.map((comment) => ({
        ...comment,
        replies: buildCommentTree(enrichedComments, comment.id),
      }))
      setComments(organizedComments)
      setCommentsLoading(false)
    })
      
      // Cleanup function for the snapshot listener
      return () => unsubscribe()
    }, 400) // 400ms delay to prioritize main content

    // Cleanup function for both timeout and potential subscription
    return () => {
      clearTimeout(commentLoadDelay)
    }
  }, [id, buildCommentTree])

  const handleLike = async () => {
    if (!poem?.id) {
      console.error("Poem ID is missing")
      showErrorToast("Unable to like - poem ID is missing")
      return
    }
    if (!currentUser) {
      console.error("User is not logged in")
      showErrorToast("Please login to like poems")
      return
    }
    try {
      const poemRef = doc(db, "poems", poem.id)
      const newLikeStatus = !liked
      setLiked(newLikeStatus) // Optimistic update
      // Update poem's likes and likedBy array
      await updateDoc(poemRef, {
        likes: increment(newLikeStatus ? 1 : -1),
        likedBy: newLikeStatus ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
      })
      // Update user's poem library
      await updatePoemLibrary(poem.id, newLikeStatus, poem.title, poem.poetId)
      // Re-fetch poem data to ensure consistency
      const updatedPoemDoc = await getDoc(poemRef)
      if (updatedPoemDoc.exists()) {
        const updatedPoemData = updatedPoemDoc.data() as Poem
        setPoem({
          ...updatedPoemData,
          id: poem.id,
        } as Poem)
      }
    } catch (error) {
      console.error("Error updating likes:", error)
      setLiked(!liked) // Revert optimistic update on error
      showErrorToast("Failed to update like status")
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser || !poem) return
    try {
      setSubmittingComment(true)
      await addDoc(collection(db, "poemComments"), {
        poemId: poem.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || null,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
      })

      if (poem.poetId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          toUserId: poem.poetId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "poem_comment",
          poemId: poem.id,
          poemTitle: poem.title,
          commentContent: newComment.trim(),
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

      setNewComment("")
      showSuccessToast("Comment posted successfully!")
    } catch (error) {
      console.error("Error submitting comment:", error)
      showErrorToast("Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim() || !currentUser || !poem) return
    try {
      setSubmittingReply(true)
      await addDoc(collection(db, "poemComments"), {
        poemId: poem.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || null,
        content: replyContent.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        parentId: parentId,
      })

      const parentCommentDoc = await getDoc(doc(db, "poemComments", parentId))
      const parentCommentData = parentCommentDoc.exists() ? parentCommentDoc.data() : null
      const parentCommentAuthorId = parentCommentData?.userId

      if (poem.poetId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          toUserId: poem.poetId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "poem_reply",
          poemId: poem.id,
          poemTitle: poem.title,
          commentContent: replyContent.trim(),
          parentId: parentId,
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

      if (
        parentCommentAuthorId &&
        parentCommentAuthorId !== poem.poetId &&
        parentCommentAuthorId !== currentUser.uid
      ) {
        await addDoc(collection(db, "notifications"), {
          toUserId: parentCommentAuthorId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "comment_reply",
          poemId: poem.id,
          poemTitle: poem.title,
          commentContent: replyContent.trim(),
          parentId: parentId,
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

      setReplyContent("")
      setReplyingTo(null)
      showSuccessToast("Reply posted successfully!")
    } catch (error) {
      console.error("Error submitting reply:", error)
      showErrorToast("Failed to post reply")
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return
    const confirmDelete = window.confirm("Are you sure you want to delete this comment? This action cannot be undone.")
    if (!confirmDelete) return
    try {
      setDeletingComment(commentId)
      await deleteDoc(doc(db, "poemComments", commentId))
      showSuccessToast("Comment deleted successfully!")
    } catch (error) {
      console.error("Error deleting comment:", error)
      showErrorToast("Failed to delete comment")
    } finally {
      setDeletingComment(null)
    }
  }

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!currentUser) return
    try {
      const commentRef = doc(db, "poemComments", commentId)
      const commentDoc = await getDoc(commentRef)
      
      if (!commentDoc.exists()) return
      
      const commentData = commentDoc.data()
      const commentAuthorId = commentData.userId
      
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
        
        if (commentAuthorId !== currentUser.uid) {
          const notificationQuery = query(
            collection(db, "notifications"),
            where("toUserId", "==", commentAuthorId),
            where("fromUserId", "==", currentUser.uid),
            where("type", "==", "comment_like"),
            where("commentId", "==", commentId)
          )
          
          const existingNotifications = await getDocs(notificationQuery)
          
          if (existingNotifications.empty) {
            await addDoc(collection(db, "notifications"), {
              toUserId: commentAuthorId,
              fromUserId: currentUser.uid,
              fromUserName: currentUser.displayName || "Anonymous User",
              type: "comment_like",
              poemId: poem?.id,
              poemTitle: poem?.title,
              commentId: commentId,
              commentContent: commentData.content,
              createdAt: new Date().toISOString(),
              read: false,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error updating comment like:", error)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const handleCopyLink = async () => {
    const poemUrl = `${window.location.origin}/poem/${poem?.id}`
    try {
      await navigator.clipboard.writeText(poemUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
      const textArea = document.createElement("textarea")
      textArea.value = poemUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleSocialShare = (platform: string) => {
    if (!poem) return
    const poemUrl = `${window.location.origin}/poem/${poem.id}`
    const shareText = `Check out "${poem.title}" by ${poem.poetName} on NovlNest!`
    let shareUrl = ""
    switch (platform) {
      case "facebook":
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          shareUrl = `fb://share?link=${encodeURIComponent(poemUrl)}`
        } else {
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poemUrl)}`
        }
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
          poemUrl,
        )}`
        break
      case "whatsapp":
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          shareUrl = `whatsapp://send?text=${encodeURIComponent(`${shareText} ${poemUrl}`)}`
        } else {
          shareUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${poemUrl}`)}`
        }
        break
      default:
        return
    }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const appWindow = window.open(shareUrl, "_blank")
      if (!appWindow || appWindow.closed || typeof appWindow.closed === "undefined") {
        setTimeout(() => {
          switch (platform) {
            case "facebook":
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poemUrl)}`, "_blank")
              break
            case "whatsapp":
              window.open(
                `https://web.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${poemUrl}`)}`,
                "_blank",
              )
              break
          }
        }, 1000)
      }
    } else {
      window.open(shareUrl, "_blank", "width=600,height=400")
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

  const canDeleteComment = (comment: Comment) => {
    if (!currentUser) return false
    return comment.userId === currentUser.uid || (poem && poem.poetId === currentUser.uid)
  }

  const handleNewCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursorPosition = e.target.selectionStart
    setNewComment(e.target.value)
    requestAnimationFrame(() => {
      if (commentTextareaRef.current) {
        commentTextareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    })
  }, [])

  const handleReplyContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyContent(e.target.value)
  }, [])

  const handleReplyToggle = useCallback(
    (commentId: string) => {
      setReplyingTo(replyingTo === commentId ? null : commentId)
      setReplyContent("")
    },
    [replyingTo],
  )

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
    setReplyContent("")
  }, [])

  interface CommentItemProps {
    comment: Comment
    isReply?: boolean
    replyingTo: string | null
    setReplyingTo: (id: string | null) => void
    replyContent: string
    submittingReply: boolean
    handleReplySubmit: (parentId: string) => Promise<void>
    handleCancelReply: () => void
    currentUser: typeof currentUser
    poem: typeof poem
    replyInputRef: React.RefObject<HTMLInputElement | null>
    handleReplyContentChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleDeleteComment: (commentId: string) => Promise<void>
    deletingComment: string | null
    handleCommentLike: (commentId: string, isLiked: boolean) => Promise<void>
  }

  const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    isReply = false,
    replyingTo,
    setReplyingTo,
    replyContent,
    submittingReply,
    handleReplySubmit,
    handleCancelReply,
    currentUser,
    poem,
    replyInputRef,
    handleReplyContentChange,
    handleDeleteComment,
    deletingComment,
    handleCommentLike,
  }) => {
    const getParentCommentData = (parentId: string | undefined): { userName: string; userId: string } | null => {
      if (!parentId) return null

      const findCommentById = (comments: Comment[], id: string): Comment | null => {
        for (const c of comments) {
          if (c.id === id) return c
          if (c.replies) {
            const found = findCommentById(c.replies, id)
            if (found) return found
          }
        }
        return null
      }

      const parentComment = findCommentById(comments, parentId)
      if (!parentComment) return null

      return {
        userName: parentComment.userName,
        userId: parentComment.userId,
      }
    }

    return (
      <div className={`mt-2 ${!isReply ? "bg-white/5 rounded-lg p-2 border border-white/10" : ""}`}>
        <div className="flex items-start space-x-3">
          <Link to={`/profile/${comment.userId}`} className="flex-shrink-0">
            {comment.userPhoto ? (
              <img
                src={comment.userPhoto || "/placeholder.svg"}
                alt={comment.userName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {getUserInitials(comment.userName)}
              </div>
            )}
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-white text-sm font-semibold">
                {isReply && comment.parentId ? (
                  <span>
                    <Link to={`/profile/${comment.userId}`} className="hover:underline">
                      {comment.userName}
                    </Link>
                    <span className="text-gray-400 font-normal"> &gt; </span>
                    {(() => {
                      const parent = getParentCommentData(comment.parentId)
                      return parent ? (
                        <Link to={`/profile/${parent.userId}`} className="hover:underline">
                          {parent.userName}
                        </Link>
                      ) : null
                    })()}
                  </span>
                ) : (
                  <Link to={`/profile/${comment.userId}`} className="hover:underline">
                    {comment.userName}
                  </Link>
                )}
              </h4>
              <span className="text-gray-400 text-xs">{formatDate(comment.createdAt)}</span>
              {comment.userId === poem?.poetId && (
                <span className="px-2 py-1 text-xs rounded-full bg-rose-900/50 text-rose-300 border border-rose-700">
                  Poet
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">{comment.content}</p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleCommentLike(comment.id, comment.likedBy?.includes(currentUser?.uid || ""))}
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
              {currentUser && (
                <button
                  onClick={() => handleReplyToggle(comment.id)}
                  className="inline-flex items-center text-xs text-gray-400 hover:text-rose-400 transition-colors"
                >
                  <FaReply className="h-3 w-3 mr-1" />
                  Reply
                </button>
              )}
              {canDeleteComment(comment) && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={deletingComment === comment.id}
                  className="inline-flex items-center text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingComment === comment.id ? (
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
                    <FaTrash className="h-3 w-3 mr-1" />
                  )}
                  Delete
                </button>
              )}
            </div>
            {replyingTo === comment.id && (
              <div className="mt-3 p-2">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL || "/placeholder.svg"}
                        alt="Your avatar"
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {getUserInitials(currentUser?.displayName || "User")}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={replyInputRef}
                      type="text"
                      value={replyContent}
                      onChange={handleReplyContentChange}
                      placeholder={`Reply to ${comment.userName}...`}
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 w-full"
                      autoComplete="off"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={handleCancelReply}
                        className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        disabled={!replyContent.trim() || submittingReply}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                      >
                        {submittingReply ? "Posting..." : "Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply={true}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                submittingReply={submittingReply}
                handleReplySubmit={handleReplySubmit}
                handleCancelReply={handleCancelReply}
                currentUser={currentUser}
                poem={poem}
                replyInputRef={replyInputRef}
                handleReplyContentChange={handleReplyContentChange}
                handleDeleteComment={handleDeleteComment}
                deletingComment={deletingComment}
                handleCommentLike={handleCommentLike}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <SkeletonLoader type="poem" />
      </div>
    )
  }

  if (error || !poem) {
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
          <h3 className="mt-4 text-xl font-medium text-white">Poem Not Found</h3>
          <p className="mt-2 text-gray-400">{error || "The poem you're looking for doesn't exist."}</p>
          <Link to="/poems" className="mt-6 inline-flex items-center text-sm text-rose-400 hover:text-rose-300">
            ← Go Back to Browse
          </Link>
        </div>
      </div>
    )
  }

  const getFirebaseDownloadUrl = (url: string) => {
    if (!url || !url.includes("firebasestorage.app")) {
      return url
    }

    try {
      const urlParts = url.split("/")
      const bucketName = urlParts[3]
      const filePath = urlParts.slice(4).join("/")
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    } catch (error) {
      console.log(`Error converting Firebase URL: ${error}`)
      return url
    }
  }

  return (
    <div className="min-h-screen py-4 sm:py-8">
      {poem && (
        <SEOHead
          title={`${poem.title} by ${poem.poetName || 'Unknown Poet'} - Free Poetry | NovlNest`}
          description={poem.description || `Read ${poem.title} by ${poem.poetName || 'Unknown Poet'} for free on NovlNest. ${poem.genres?.join(', ')} poetry.`}
          canonicalUrl={`https://novlnest.com/poem/${poem.id}`}
          keywords={`${poem.title}, ${poem.poetName}, ${poem.genres?.join(', ')}, poetry, free poem, online reading`}
          image={poem.coverImage ? `https://novlnest.com${poem.coverImage}` : "https://novlnest.com/images/logo.png"}
          url={`https://novlnest.com/poem/${poem.id}`}
          type="article"
        />
      )}
      
      <div className="max-w-7xl mx-auto px-2 lg:px-8 pt-3">
        {/* Header */}
        <div>
          <Link
            to="/poems"
            className="inline-flex items-center text-rose-400 hover:text-rose-300 my-4 transition-colors text-sm sm:text-base"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Browse
          </Link>
        </div>
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Side - Poem Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* Poem Header */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Cover Image */}
                <div className="w-full md:w-1/3 md:h-auto relative bg-[#070707] sm:h-[400px]">
                  {poem.coverImage ? (
                    <img
                      src={getFirebaseDownloadUrl(poem.coverImage || "/placeholder.svg")}
                      alt={poem.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getPoemGenreColorClass(poem.genres || [])} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 left-4 w-8 h-8 border border-white rounded-full"></div>
                        <div className="absolute top-12 right-6 w-4 h-4 bg-white rounded-full"></div>
                        <div className="absolute bottom-6 left-6 w-6 h-6 border border-white"></div>
                      </div>
                      <svg className="h-16 w-16 text-white/60 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Poem Info */}
                <div className="w-full md:w-2/3 p-4 sm:p-6 md:p-8">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white mb-2 sm:mb-4">{poem.title}</h1>
                  <p className="text-sm sm:text-lg text-gray-300 mb-3 sm:mb-4 font-serif italic">
                    "{poem.description}"
                  </p>
                  <Link
                    to={`/profile/${poem.poetId}`}
                    className="block mb-3 sm:mb-4 text-sm text-rose-400 hover:text-rose-300 font-serif"
                  >
                    By {poem.poetName}
                  </Link>
                  {/* Genres */}
                  <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    {poem.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-rose-500/20 text-rose-300 text-sm rounded-full border border-rose-500/30 font-serif"
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
                      {poem.likes || 0}
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
                      {poem.views || 0}
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Link
                      to={`/poem/${poem.id}/read`}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      Read Poem
                    </Link>
                    <button
                      onClick={handleShare}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 transform hover:scale-105"
                    >
                      <FaShare className="h-4 w-4 mr-2" />
                      Share
                    </button>
                    {poetData?.supportLink && (
                      <button
                        onClick={() => setIsTipModalOpen(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-green-600/20 hover:bg-green-600/30 text-green-400 font-semibold rounded-xl transition-all duration-200 border border-green-600/30 hover:border-green-600/50 transform hover:scale-105"
                        title="Support this poet"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Gift
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Right Side - Comments */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                <svg className="h-5 w-5 mr-2 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Comments ({comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)})
              </h2>
              {/* Comment Form */}
              {currentUser ? (
                <form onSubmit={handleCommentSubmit} className="mb-4 sm:mb-6">
                  <div className="flex items-start space-x-3">
                    <Link to={`/profile/${currentUser.uid}`} className="flex-shrink-0">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL || "/placeholder.svg"}
                          alt="Your avatar"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getUserInitials(currentUser.displayName || "User")}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <textarea
                        ref={commentTextareaRef}
                        value={newComment}
                        onChange={handleNewCommentChange}
                        placeholder="Share your thoughts about this poem..."
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || submittingComment}
                        className="mt-2 inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
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
                  <Link to="/login" className="inline-flex items-center text-rose-400 hover:text-rose-300 text-sm">
                    Sign In →
                  </Link>
                </div>
              )}
              {/* Comments List */}
              <div className="space-y-3 sm:space-y-4 max-h-[50vh] lg:max-h-96 overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-600"></div>
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
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                      replyContent={replyContent}
                      submittingReply={submittingReply}
                      handleReplySubmit={handleReplySubmit}
                      handleCancelReply={handleCancelReply}
                      currentUser={currentUser}
                      poem={poem}
                      replyInputRef={replyInputRef}
                      handleReplyContentChange={handleReplyContentChange}
                      handleDeleteComment={handleDeleteComment}
                      deletingComment={deletingComment}
                      handleCommentLike={handleCommentLike}
                    />
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
              <h3 className="text-xl font-bold text-white">Share Poem</h3>
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
                <div className="flex items-center justify-between">
                  <div className="inline-grid mr-3">
                    <p className="text-sm text-gray-300 mb-1">Share Link</p>
                    <p className="text-xs text-gray-400 truncate">{`${window.location.origin}/poem/${poem.id}`}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copySuccess ? "bg-green-600 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
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

      {/* Tip Modal */}
      {isTipModalOpen && poetData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full relative border border-gray-700">
            <button
              onClick={() => setIsTipModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <FaTimes className="h-6 w-6" />
            </button>
            
            <div className="text-center mb-6">
              <Gift className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Want to tip this poet?</h2>
              <p className="text-gray-300">Here are the payment details:</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-3">Payment Information</h3>
                {(() => {
                  const supportLink = poetData.supportLink
                  const isUrl = supportLink?.startsWith('http')
                  
                  if (isUrl) {
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-col justify-between">
                          <span className="text-gray-300">Support Link:</span>
                          <a 
                            href={supportLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline break-all"
                          >
                            {supportLink}
                          </a>
                        </div>
                      </div>
                    )
                  } else {
                    return (
                      <div className="space-y-2 text-left">
                        <div className="flex flex-col justify-between">
                          <span className="text-gray-300">Bank:</span>
                          <span className="text-white font-medium">
                            {supportLink?.split(':')[0] || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col justify-between">
                          <span className="text-gray-300">Account Number:</span>
                          <span className="text-white font-medium">
                            {supportLink?.split(':')[1]?.split(',')[0]?.trim() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col justify-between">
                          <span className="text-gray-300">Account Name:</span>
                          <span className="text-white font-medium">
                            {supportLink?.split(',')[1]?.trim() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const supportText = poetData.supportLink
                  if (supportText) {
                    navigator.clipboard.writeText(supportText)
                    const isUrl = supportText.startsWith('http')
                    showSuccessToast(isUrl ? "Support link copied to clipboard!" : "Payment details copied to clipboard!")
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <FaCopy className="h-4 w-4 mr-2" />
                {(() => {
                  const supportText = poetData.supportLink
                  const isUrl = supportText?.startsWith('http')
                  return isUrl ? "Copy Link" : "Copy Details"
                })()}
              </button>
              <button
                onClick={() => {
                  const supportText = poetData.supportLink
                  if (supportText) {
                    const isUrl = supportText.startsWith('http')
                    const shareText = isUrl 
                      ? `Support this poet: ${supportText}`
                      : `Support this poet: ${supportText}`
                    
                    if (navigator.share) {
                      navigator.share({ text: shareText })
                    } else {
                      navigator.clipboard.writeText(shareText)
                      showSuccessToast("Share text copied to clipboard!")
                    }
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <FaShare className="h-4 w-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PoemOverview
