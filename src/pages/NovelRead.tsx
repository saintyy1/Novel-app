"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, setDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import ReactMarkdown from "react-markdown"
import { useSwipeable } from "react-swipeable"
import { BookOpen, Heart, MessageCircle, ChevronLeft, X, Trash2, Reply, ChevronRight } from "lucide-react"

interface Comment {
  id: string
  text: string
  userId: string
  userName: string
  userPhoto?: string
  createdAt: string
  parentId?: string
  replies?: Comment[]
  likes?: number
  likedBy?: string[]
}

interface CommentItemProps {
  comment: Comment
  isReply?: boolean
  currentUser: any
  novel: Novel | null
  handleCommentLike: (id: string, liked: boolean) => void
  handleReplyToggle: (id: string) => void
  canDeleteComment: (comment: Comment) => boolean
  handleDeleteComment: (id: string) => void
  replyingTo: string | null
  replyContent: string
  setReplyContent: (v: string) => void
  handleReplySubmitDirect: (e: React.FormEvent, parentId: string) => void
  setReplyingTo: (v: string | null) => void
  deletingComment: string | null
  getUserInitials: (name: string) => string
  formatDate: (dateString: string) => string
  replyInputRef: React.RefObject<HTMLInputElement | null>
}

const CommentItem = ({
  comment,
  isReply = false,
  currentUser,
  novel,
  handleCommentLike,
  handleReplyToggle,
  canDeleteComment,
  handleDeleteComment,
  replyingTo,
  replyContent,
  setReplyContent,
  handleReplySubmitDirect,
  setReplyingTo,
  deletingComment,
  getUserInitials,
  formatDate,
  replyInputRef,
}: CommentItemProps) => (
  <div className={`bg-gray-700 rounded-lg p-3 ${isReply ? "ml-6 mt-2" : ""}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center space-x-2">
        {/* Avatar - Fixed to show the comment author's photo */}
        <div className="flex-shrink-0">
          {comment.userPhoto ? (
            <img
              src={comment.userPhoto || "/placeholder.svg"}
              alt={comment.userName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {getUserInitials(comment.userName)}
            </div>
          )}
        </div>
        <div>
          <span className="font-medium text-white">{comment.userName}</span>
          {comment.userId === novel?.authorId && (
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
              Author
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
    </div>
    <p className="text-gray-300 mb-2">{comment.text}</p>
    <div className="flex items-center space-x-4">
      {/* Like Button */}
      <button
        onClick={() => handleCommentLike(comment.id, !!comment.likedBy?.includes(currentUser?.uid || ""))}
        disabled={!currentUser}
        className={`inline-flex items-center text-xs ${
          comment.likedBy?.includes(currentUser?.uid || "") ? "text-red-400" : "text-gray-400 hover:text-red-400"
        } transition-colors ${!currentUser ? "cursor-not-allowed" : ""}`}
      >
        <Heart
          className={`h-4 w-4 mr-1 ${comment.likedBy?.includes(currentUser?.uid || "") ? "fill-current" : ""}`}
          fill={comment.likedBy?.includes(currentUser?.uid || "") ? "currentColor" : "none"}
        />
        {comment.likes || 0}
      </button>
      {/* Reply Button - Only for top-level comments */}
      {!isReply && currentUser && (
        <button
          onClick={() => handleReplyToggle(comment.id)}
          className="inline-flex items-center text-xs text-gray-400 hover:text-purple-400 transition-colors"
        >
          <Reply className="h-3 w-3 mr-1" />
          Reply
        </button>
      )}
      {/* Delete Button */}
      {canDeleteComment(comment) && (
        <button
          onClick={() => handleDeleteComment(comment.id)}
          disabled={deletingComment === comment.id}
          className="inline-flex items-center text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {deletingComment === comment.id ? (
            <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
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
    {/* Reply Form */}
    {replyingTo === comment.id && (
      <div className="mt-3 p-3 bg-gray-600 rounded-lg">
        <form onSubmit={(e) => handleReplySubmitDirect(e, comment.id)}>
          <input
            ref={replyInputRef}
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Reply to ${comment.userName}...`}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
            autoComplete="off"
            autoFocus
          />
          <div className="flex items-center space-x-2 mt-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null)
                setReplyContent("")
              }}
              className="px-3 py-2 text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!replyContent.trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    )}
    {/* Replies */}
    {comment.replies && comment.replies.length > 0 && (
      <div className="mt-3">
        {comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            isReply={true}
            currentUser={currentUser}
            novel={novel}
            handleCommentLike={handleCommentLike}
            handleReplyToggle={handleReplyToggle}
            canDeleteComment={canDeleteComment}
            handleDeleteComment={handleDeleteComment}
            replyingTo={replyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            handleReplySubmitDirect={handleReplySubmitDirect}
            setReplyingTo={setReplyingTo}
            deletingComment={deletingComment}
            getUserInitials={getUserInitials}
            formatDate={formatDate}
            replyInputRef={replyInputRef}
          />
        ))}
      </div>
    )}
  </div>
)

interface CommentModalProps {
  comments: Comment[]
  currentUser: any
  newComment: string
  setNewComment: (v: string) => void
  handleSubmitDirect: (e: React.FormEvent) => void
  setShowCommentModal: (v: boolean) => void
  CommentItem: React.FC<CommentItemProps>
  novel: Novel | null
  handleCommentLike: (id: string, liked: boolean) => void
  handleReplyToggle: (id: string) => void
  canDeleteComment: (comment: Comment) => boolean
  handleDeleteComment: (id: string) => void
  replyingTo: string | null
  replyContent: string
  setReplyContent: (v: string) => void
  handleReplySubmitDirect: (e: React.FormEvent, parentId: string) => void
  setReplyingTo: (v: string | null) => void
  deletingComment: string | null
  getUserInitials: (name: string) => string
  formatDate: (dateString: string) => string
  replyInputRef: React.RefObject<HTMLInputElement | null>
}

const CommentModal = ({
  comments,
  currentUser,
  newComment,
  setNewComment,
  handleSubmitDirect,
  setShowCommentModal,
  CommentItem,
  novel,
  handleCommentLike,
  handleReplyToggle,
  canDeleteComment,
  handleDeleteComment,
  replyingTo,
  replyContent,
  setReplyContent,
  handleReplySubmitDirect,
  setReplyingTo,
  deletingComment,
  getUserInitials,
  formatDate,
  replyInputRef,
}: CommentModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus the modal when it opens for accessibility
    if (modalRef.current) {
      modalRef.current.focus()
    }

    // Handle Escape key to close the modal
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCommentModal(false)
        setNewComment("")
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [setShowCommentModal, setNewComment])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowCommentModal(false)
          setNewComment("")
        }
      }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1} // Make the div focusable
      ref={modalRef}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            Comments (
            {comments.reduce((total: number, comment: Comment) => total + 1 + (comment.replies?.length || 0), 0)})
          </h3>
          <button
            onClick={() => {
              setShowCommentModal(false)
              setNewComment("")
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                novel={novel}
                handleCommentLike={handleCommentLike}
                handleReplyToggle={handleReplyToggle}
                canDeleteComment={canDeleteComment}
                handleDeleteComment={handleDeleteComment}
                replyingTo={replyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleReplySubmitDirect={handleReplySubmitDirect}
                setReplyingTo={setReplyingTo}
                deletingComment={deletingComment}
                getUserInitials={getUserInitials}
                formatDate={formatDate}
                replyInputRef={replyInputRef}
              />
            ))
          )}
        </div>
        {currentUser && (
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSubmitDirect} className="flex space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

const NovelRead = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [currentChapter, setCurrentChapter] = useState<number>(0)
  const { currentUser } = useAuth()
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [chapterLiked, setChapterLiked] = useState(false)
  const [chapterLikes, setChapterLikes] = useState(0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)

  const [currentPage, setCurrentPage] = useState(0)
  const [pageFade, setPageFade] = useState(false)
  const lastSwipeTime = useRef(0)
  const bookContentRef = useRef<HTMLDivElement>(null)

  // Helper: Split content into readable paragraphs
  const formatContent = (content: string) => {
    if (!content) return []
    // First, split by existing paragraph breaks (double newlines, <br>, </n>, etc.)
    const paragraphs = content
      .split(/(<\/n>|\\n\\n|\n\n|<br\s*\/?>)/gi)
      .filter((para) => para.trim() && !para.match(/(<\/n>|\\n\\n|\n\n|<br\s*\/?>)/gi))
    const formattedParagraphs: string[] = []
    paragraphs.forEach((paragraph) => {
      const cleanPara = paragraph.trim()
      if (!cleanPara) return
      // Split long paragraphs by sentences
      const sentences = cleanPara.split(/(?<=[.!?])\s+/).filter((s) => s.trim())
      if (sentences.length <= 6) {
        // If 6 or fewer sentences, keep as one paragraph
        formattedParagraphs.push(cleanPara)
      } else {
        // Break into chunks of 4-6 sentences for better readability
        for (let i = 0; i < sentences.length; i += 5) {
          const chunk = sentences
            .slice(i, i + 5)
            .join(" ")
            .trim()
          if (chunk) {
            formattedParagraphs.push(chunk)
          }
        }
      }
    })
    // If no paragraphs were created (single long text), split by character count
    if (formattedParagraphs.length === 0 && content.trim()) {
      const words = content.trim().split(/\s+/)
      const wordsPerParagraph = 100 // Approximately 6-8 lines
      for (let i = 0; i < words.length; i += wordsPerParagraph) {
        const chunk = words
          .slice(i, i + wordsPerParagraph)
          .join(" ")
          .trim()
        if (chunk) {
          formattedParagraphs.push(chunk)
        }
      }
    }
    return formattedParagraphs.length > 0 ? formattedParagraphs : [content.trim()]
  }

  // Helper: Paginate paragraphs into pages
  const paginateContentIntoPages = (paragraphs: string[], paragraphsPerPage = 4) => {
  const contentPages: string[][] = []
  let currentPage: string[] = []

  paragraphs.forEach((paragraph) => {
    if (currentPage.length >= paragraphsPerPage) {
      contentPages.push([...currentPage])
      currentPage = []
    }
    currentPage.push(paragraph)
  })

  if (currentPage.length > 0) {
    contentPages.push(currentPage)
  }

  return contentPages
}

  // Prepare pages for the current chapter, including the title page
  const [chapterPages, setChapterPages] = useState<("title" | string[])[]>([])

  useEffect(() => {
    if (novel) {
      const pages: ("title" | string[])[] = []
      const chapterContent = novel.chapters[currentChapter]?.content || ""
      const formattedParagraphs = formatContent(chapterContent)
      const contentPages = paginateContentIntoPages(formattedParagraphs, 4)
      pages.push("title") // First page is always the chapter title page
      contentPages.forEach((page) => pages.push(page))
      setChapterPages(pages)
    }
  }, [novel, currentChapter])

  // Book mode: handle animated page transitions
  const changeBookPage = (newPage: number) => {
    if (newPage === currentPage) return
    setPageFade(true)
    setTimeout(() => {
      setCurrentPage(newPage)
      setTimeout(() => setPageFade(false), 300)
    }, 300)
  }

  // Swipe handlers for book mode (debounced, with animation)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const now = Date.now()
      if (now - lastSwipeTime.current > 350) {
        lastSwipeTime.current = now
        if (currentPage < chapterPages.length - 1) {
          changeBookPage(currentPage + 1)
        } else if (currentChapter < (novel?.chapters.length || 0) - 1) {
          // Go to next chapter, first page
          setPageFade(true)
          setTimeout(() => {
            setCurrentChapter((prev) => prev + 1)
            setCurrentPage(0) // Go to first page of next chapter
            setTimeout(() => setPageFade(false), 300)
          }, 300)
        }
      }
    },
    onSwipedRight: () => {
      const now = Date.now()
      if (now - lastSwipeTime.current > 350) {
        lastSwipeTime.current = now
        if (currentPage > 0) {
          changeBookPage(currentPage - 1)
        } else if (currentChapter > 0) {
          // Go to previous chapter, last page
          setPageFade(true)
          setTimeout(() => {
            const prevChapterIndex = currentChapter - 1
            if (novel && prevChapterIndex >= 0) {
              // Recalculate pages for the previous chapter to get its last page index
              const prevChapterContent = novel.chapters[prevChapterIndex]?.content || ""
              const prevFormattedParagraphs = formatContent(prevChapterContent)
              const prevContentPages = paginateContentIntoPages(prevFormattedParagraphs, 8)
              const prevChapterTotalPages = prevContentPages.length // Number of content pages
              setCurrentChapter(prevChapterIndex)
              setCurrentPage(prevChapterTotalPages) // Set to the last content page (index is length-1, plus 1 for title page)
            }
            setTimeout(() => setPageFade(false), 300)
          }, 300)
        }
      }
    },
    trackMouse: true
  })

  // Render current page content
 const renderCurrentPageContent = () => {
  if (!novel) return null

  const pageContent = chapterPages[currentPage]

  if (pageContent === "title") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 sm:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight">
          {novel.chapters[currentChapter].title}
        </h2>
        <div className="w-16 sm:w-24 h-1 bg-purple-500 my-4 sm:my-6 rounded-full"></div>
        <p className="text-lg sm:text-xl md:text-2xl font-serif text-gray-300">By {novel.authorName}</p>
      </div>
    )
  } else if (Array.isArray(pageContent)) {
    return (
      <div className="min-h-[60vh] px-4 sm:px-6 md:px-8 py-6 flex items-center">
        <div className="prose prose-lg dark:prose-invert max-w-none mx-auto">
          {pageContent.map((paragraph, idx) => (
            <div
              key={idx}
              className="mb-6 text-gray-300 leading-relaxed text-base sm:text-lg indent-6 sm:indent-8 text-justify font-serif"
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {paragraph}
              </ReactMarkdown>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}


  useEffect(() => {
    const fetchNovel = async () => {
      if (!id) return
      try {
        setLoading(true)
        const novelDoc = await getDoc(doc(db, "novels", id))
        if (novelDoc.exists()) {
          const novelData = novelDoc.data()
          setNovel({
            id: novelDoc.id,
            ...novelData,
          } as Novel)
          // Get chapter from URL params
          const chapterParam = searchParams.get("chapter")
          let initialChapterIndex = 0
          if (chapterParam) {
            const parsedChapterIndex = Number.parseInt(chapterParam, 10)
            if (parsedChapterIndex >= 0 && parsedChapterIndex < novelData.chapters.length) {
              initialChapterIndex = parsedChapterIndex
            }
          }
          setCurrentChapter(initialChapterIndex)
          setCurrentPage(0) // Always start at page 0 for a new chapter load
          if (currentUser) {
            await updateDoc(doc(db, "novels", id), {
              views: increment(1),
            })
          }
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
  }, [id, currentUser, searchParams])

  useEffect(() => {
    // Reset states when chapter changes
    setChapterLiked(false)
    setChapterLikes(0)
    setComments([])
    setReplyingTo(null)
    setReplyContent("")
    const fetchChapterData = async () => {
      if (!novel) return
      try {
        const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
        const chapterDoc = await getDoc(chapterRef)
        if (chapterDoc.exists()) {
          const chapterData = chapterDoc.data()
          setChapterLiked(currentUser ? chapterData.chapterLikedBy?.includes(currentUser.uid) || false : false)
          setChapterLikes(chapterData.chapterLikes || 0)
          // Organize comments with replies
          const allComments = chapterData.comments || []
          const organizedComments = organizeCommentsWithReplies(allComments)
          setComments(organizedComments)
        }
      } catch (error) {
        console.error("Error fetching chapter data:", error)
      }
    }
    fetchChapterData()
  }, [novel, currentUser, currentChapter])

  // Adjust current page if it's out of bounds for the new chapter
  useEffect(() => {
    if (currentPage >= chapterPages.length) {
      setCurrentPage(chapterPages.length > 0 ? chapterPages.length - 1 : 0)
    }
  }, [currentChapter, currentPage, chapterPages.length])

  const organizeCommentsWithReplies = useCallback((allComments: Comment[]): Comment[] => {
    const topLevelComments = allComments.filter((comment) => !comment.parentId)
    const replies = allComments.filter((comment) => comment.parentId)
    return topLevelComments.map((comment) => ({
      ...comment,
      replies: replies
        .filter((reply) => reply.parentId === comment.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
  }, [])

  const handleChapterLike = async () => {
    if (!novel?.id || !currentUser) return
    try {
      const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
      const chapterDoc = await getDoc(chapterRef)
      const newLikeStatus = !chapterLiked
      setChapterLiked(newLikeStatus)
      if (!chapterDoc.exists()) {
        // Create the chapter document if it doesn't exist
        await setDoc(chapterRef, {
          chapterLikes: newLikeStatus ? 1 : 0,
          chapterLikedBy: newLikeStatus ? [currentUser.uid] : [],
          comments: [],
        })
        setChapterLikes(newLikeStatus ? 1 : 0)
      } else {
        // Update existing document
        if (newLikeStatus) {
          await updateDoc(chapterRef, {
            chapterLikes: increment(1),
            chapterLikedBy: arrayUnion(currentUser.uid),
          })
          setChapterLikes((prev) => prev + 1)
        } else {
          await updateDoc(chapterRef, {
            chapterLikes: increment(-1),
            chapterLikedBy: arrayRemove(currentUser.uid),
          })
          setChapterLikes((prev) => prev - 1)
        }
      }
    } catch (error) {
      console.error("Error updating chapter like:", error)
      setChapterLiked(!chapterLiked)
    }
  }

  const handleAddComment = async () => {
    if (!novel?.id || !currentUser || !newComment.trim()) return
    try {
      const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
      const chapterDoc = await getDoc(chapterRef)
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
      }
      let updatedComments: Comment[]
      if (!chapterDoc.exists()) {
        // Create the chapter document if it doesn't exist
        await setDoc(chapterRef, {
          chapterLikes: 0,
          chapterLikedBy: [],
          comments: [comment],
        })
        updatedComments = [comment]
      } else {
        // Update existing document
        const existingComments = chapterDoc.data().comments || []
        updatedComments = [...existingComments, comment]
        await updateDoc(chapterRef, {
          comments: updatedComments,
        })
      }
      const organizedComments = organizeCommentsWithReplies(updatedComments)
      setComments(organizedComments)
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!novel?.id || !currentUser || !replyContent.trim()) return
    try {
      const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
      const chapterDoc = await getDoc(chapterRef)
      if (!chapterDoc.exists()) return
      const reply: Comment = {
        id: Date.now().toString(),
        text: replyContent.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
        parentId: parentId,
        likes: 0,
        likedBy: [],
      }
      const existingComments = chapterDoc.data().comments || []
      const updatedComments = [...existingComments, reply]
      await updateDoc(chapterRef, {
        comments: updatedComments,
      })
      const organizedComments = organizeCommentsWithReplies(updatedComments)
      setComments(organizedComments)
      setReplyContent("")
      setReplyingTo(null)
    } catch (error) {
      console.error("Error adding reply:", error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!novel?.id || !currentUser) return
    const confirmDelete = window.confirm("Are you sure you want to delete this comment? This action cannot be undone.")
    if (!confirmDelete) return
    try {
      setDeletingComment(commentId)
      const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
      const chapterDoc = await getDoc(chapterRef)
      if (!chapterDoc.exists()) return
      const existingComments = chapterDoc.data().comments || []
      // Remove the comment and its replies
      const updatedComments = existingComments.filter(
        (comment: Comment) => comment.id !== commentId && comment.parentId !== commentId,
      )
      await updateDoc(chapterRef, {
        comments: updatedComments,
      })
      const organizedComments = organizeCommentsWithReplies(updatedComments)
      setComments(organizedComments)
    } catch (error) {
      console.error("Error deleting comment:", error)
    } finally {
      setDeletingComment(null)
    }
  }

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!novel?.id || !currentUser) return
    try {
      const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
      const chapterDoc = await getDoc(chapterRef)
      if (!chapterDoc.exists()) return
      const existingComments = chapterDoc.data().comments || []
      const updatedComments = existingComments.map((comment: Comment) => {
        if (comment.id === commentId) {
          const likedBy = comment.likedBy || []
          if (isLiked) {
            return {
              ...comment,
              likes: (comment.likes || 0) - 1,
              likedBy: likedBy.filter((uid: string) => uid !== currentUser.uid),
            }
          } else {
            return {
              ...comment,
              likes: (comment.likes || 0) + 1,
              likedBy: [...likedBy, currentUser.uid],
            }
          }
        }
        return comment
      })
      await updateDoc(chapterRef, {
        comments: updatedComments,
      })
      const organizedComments = organizeCommentsWithReplies(updatedComments)
      setComments(organizedComments)
    } catch (error) {
      console.error("Error updating comment like:", error)
    }
  }

  const canDeleteComment = (comment: Comment): boolean => {
    if (!currentUser || !novel) return false
    // User can delete their own comments or novel author can delete any comment
    return comment.userId === currentUser.uid || novel.authorId === currentUser.uid
  }

  // Update the submit handlers to be more direct
  const handleSubmitDirect = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (newComment.trim()) {
        handleAddComment()
      }
    },
    [newComment],
  )

  const handleReplySubmitDirect = useCallback(
    (e: React.FormEvent, parentId: string) => {
      e.preventDefault()
      if (replyContent.trim()) {
        handleAddReply(parentId)
      }
    },
    [replyContent],
  )

  const handleReplyToggle = useCallback(
    (commentId: string) => {
      setReplyingTo(replyingTo === commentId ? null : commentId)
      setReplyContent("")
    },
    [replyingTo],
  )

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
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

  // Floating Actions component
  const FloatingActions = () => (
    <div className="fixed bottom-4 sm:bottom-6 right-2 sm:right-6 flex flex-col items-end space-y-3 sm:space-y-4">
      {/* Like Button with Count */}
      <div className="flex flex-col items-center scale-90 sm:scale-100">
        <div
          onClick={handleChapterLike}
          className={`cursor-pointer transition-all transform hover:scale-110 ${
            !currentUser ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={currentUser ? "Like this chapter" : "Login to like"}
        >
          <Heart
            className={`h-6 sm:h-7 w-6 sm:w-7 ${chapterLiked ? "text-red-500 fill-current" : "text-gray-300"}`}
            fill={chapterLiked ? "currentColor" : "none"}
          />
        </div>
        <span className="text-xs sm:text-sm text-gray-300 mt-1">{chapterLikes}</span>
      </div>
      {/* Comment Button */}
      <div className="flex flex-col items-center scale-90 sm:scale-100">
        <div
          onClick={() => setShowCommentModal(true)}
          className={`cursor-pointer transition-all transform hover:scale-110 ${
            !currentUser ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={currentUser ? "View comments" : "Login to comment"}
        >
          <MessageCircle
            className={`h-6 sm:h-7 w-6 sm:w-7 ${comments.length > 0 ? "text-purple-500" : "text-gray-300"}`}
          />
        </div>
        <span className="text-xs sm:text-sm text-gray-300 mt-1">
          {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)}
        </span>
      </div>
    </div>
  )

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
          <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-xl font-medium text-white">Novel Not Found</h3>
          <p className="mt-2 text-gray-400">{error}</p>
          <div className="mt-6">
            <Link
              to="/novels"
              className="inline-flex items-center text-sm text-purple-400 font-medium hover:text-purple-300"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Browse
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Back button - Make it more accessible on mobile */}
      <div className="fixed top-0 right-0 z-50 p-4 bg-gradient-to-b from-gray-900/80 to-transparent w-full flex justify-end">
  <Link
    to={`/novel/${novel.id}`}
    className="p-2 rounded-full bg-gray-800/90 text-gray-300 hover:bg-gray-700/90 hover:text-white transition-colors shadow-lg backdrop-blur-sm"
    title="Back to Novel Overview"
  >
    <X className="h-5 w-5 sm:h-6 sm:w-6" />
  </Link>
</div>
      {/* Main content area */}
      <div className="flex-grow py-2 sm:py-4 flex items-center justify-center">
        <div className="relative bg-gray-800 rounded-xl shadow-lg py-6 sm:py-9 px-3 sm:px-8 md:px-12 w-full max-w-4xl mx-2 sm:mx-4 flex flex-col justify-between">
          {/* Chapter indicator */}
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 text-xs sm:text-sm">
            Chapter {currentChapter + 1}
          </div>
          {/* Content */}
          <div
  {...swipeHandlers}
  className={`flex-grow flex flex-col justify-center transition-opacity duration-300 ${
    pageFade ? "opacity-0" : "opacity-100"
  }`}
  ref={bookContentRef}
>
  {renderCurrentPageContent()}
</div>

          {/* Page indicator and buttons for larger screens */}
          <div className="flex justify-center md:justify-between items-center w-full mt-4 pt-4 border-t border-gray-700">
            <button
              className={`hidden md:block p-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 0
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-purple-900 text-purple-200 hover:bg-purple-800"
              }`}
              disabled={currentPage === 0}
              onClick={() => changeBookPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span className="text-gray-300 text-xs sm:text-sm font-medium whitespace-nowrap">
              {currentPage + 1}
            </span>
            <button
              className={`hidden md:block p-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === chapterPages.length - 1
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-purple-900 text-purple-200 hover:bg-purple-800"
              }`}
              disabled={currentPage === chapterPages.length - 1}
              onClick={() => changeBookPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Actions component */}
      <FloatingActions />
      {/* Comment Modal */}
      {showCommentModal && (
        <CommentModal
          comments={comments}
          currentUser={currentUser}
          newComment={newComment}
          setNewComment={setNewComment}
          handleSubmitDirect={handleSubmitDirect}
          setShowCommentModal={setShowCommentModal}
          CommentItem={CommentItem}
          novel={novel}
          handleCommentLike={handleCommentLike}
          handleReplyToggle={handleReplyToggle}
          canDeleteComment={canDeleteComment}
          handleDeleteComment={handleDeleteComment}
          replyingTo={replyingTo}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          handleReplySubmitDirect={handleReplySubmitDirect}
          setReplyingTo={setReplyingTo}
          deletingComment={deletingComment}
          getUserInitials={getUserInitials}
          formatDate={formatDate}
          replyInputRef={replyInputRef}
        />
      )}
    </div>
  )
}

export default NovelRead
