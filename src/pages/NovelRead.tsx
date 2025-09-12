"use client"
import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { trackPageView, trackChapterRead, trackEngagementTime, trackAnonymousPageView } from '../utils/Analytics-utils';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { useTranslation } from "../context/TranslationContext"
import type { Novel } from "../types/novel"
import ReactMarkdown from "react-markdown"
import { useSwipeable } from "react-swipeable"
import { useRef as useReactRef } from "react"
import { BookOpen, Heart, MessageCircle, ChevronLeft, ChevronRight, X, Trash2, Reply } from "lucide-react"
import LanguageSelector from "../components/LanguageSelector"

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
  allComments?: Comment[] // Add all comments to trace reply chain
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
  allComments = [],
}: CommentItemProps) => {
  // Function to get parent comment data (like NovelOverview)
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

    const parentComment = findCommentById(allComments, parentId)
    if (!parentComment) return null

    return {
      userName: parentComment.userName,
      userId: parentComment.userId,
    }
  }

  return (
  <div className={`bg-gray-700 rounded-lg ${isReply ? "mt-2" : "p-3"}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center space-x-2">
        {/* Avatar - Fixed to show the comment author's photo */}
        <div className="flex-shrink-0">
          <Link
            to={`/profile/${comment.userId}`}
            className="block"
            onClick={(e) => e.stopPropagation()}
          >
            {comment.userPhoto ? (
              <img
                src={comment.userPhoto || "/placeholder.svg"}
                alt={comment.userName}
                className="h-8 w-8 rounded-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
              />
            ) : (
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                {getUserInitials(comment.userName)}
              </div>
            )}
          </Link>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold">
            {isReply && comment.parentId ? (
              <span>
                <Link
                  to={`/profile/${comment.userId}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {comment.userName}
                </Link>
                <span className="text-gray-400 font-normal"> &gt; </span>
                {(() => {
                  const parent = getParentCommentData(comment.parentId)
                  return parent ? (
                    <Link
                      to={`/profile/${parent.userId}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {parent.userName}
                    </Link>
                  ) : null
                })()}
              </span>
            ) : (
              <Link
                to={`/profile/${comment.userId}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {comment.userName}
              </Link>
            )}
          </h4>
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
      {/* Reply Button - Available for all comments */}
      {currentUser && (
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
              Reply
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
            allComments={allComments}
          />
        ))}
      </div>
    )}
  </div>
  )
}

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
  allComments: Comment[]
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
  allComments,
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
                canDeleteComment={canDeleteComment} // Removed redundant Boolean()
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
                allComments={allComments}
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
  const { currentUser, isAdmin } = useAuth()
  const { t, translateParagraphs, language } = useTranslation()
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
  const lastSwipeTime = useReactRef(0)
  const bookContentRef = useReactRef<HTMLDivElement>(null)
  const [showGraphicWarning, setShowGraphicWarning] = useState(false)
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false)
  const [translatedContent, setTranslatedContent] = useState<string[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  // Determine permission to copy/paste: allowed if admin or the novel's author
  const canCopyContent = !!(
    isAdmin || (currentUser && novel && currentUser.uid === novel.authorId)
  )

  // Prevent copy/paste and selection within the reading area for unauthorized users
  useEffect(() => {
    const container = bookContentRef.current
    if (canCopyContent) return

    const prevent = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const keydownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "x" || key === "v" || key === "a")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Strengthen by listening on document as well
    document.addEventListener("copy", prevent, true)
    document.addEventListener("cut", prevent, true)
    document.addEventListener("paste", prevent, true)
    document.addEventListener("contextmenu", prevent, true)
    document.addEventListener("selectstart", prevent, true)
    document.addEventListener("dragstart", prevent, true)
    document.addEventListener("keydown", keydownHandler, true)

    // Also try scoping to container if present
    if (container) {
      container.addEventListener("copy", prevent)
      container.addEventListener("cut", prevent)
      container.addEventListener("paste", prevent)
      container.addEventListener("contextmenu", prevent)
      container.addEventListener("selectstart", prevent)
      container.addEventListener("dragstart", prevent)
      container.addEventListener("keydown", keydownHandler)
    }

    // Temporarily disable selection on body
    const previousUserSelect = document.body.style.userSelect
    const previousWebkitUserSelect = (document.body.style as any).webkitUserSelect
    document.body.style.userSelect = "none"
    ;(document.body.style as any).webkitUserSelect = "none"

    return () => {
      document.removeEventListener("copy", prevent, true)
      document.removeEventListener("cut", prevent, true)
      document.removeEventListener("paste", prevent, true)
      document.removeEventListener("contextmenu", prevent, true)
      document.removeEventListener("selectstart", prevent, true)
      document.removeEventListener("dragstart", prevent, true)
      document.removeEventListener("keydown", keydownHandler, true)

      if (container) {
        container.removeEventListener("copy", prevent)
        container.removeEventListener("cut", prevent)
        container.removeEventListener("paste", prevent)
        container.removeEventListener("contextmenu", prevent)
        container.removeEventListener("selectstart", prevent)
        container.removeEventListener("dragstart", prevent)
        container.removeEventListener("keydown", keydownHandler)
      }

      document.body.style.userSelect = previousUserSelect
      ;(document.body.style as any).webkitUserSelect = previousWebkitUserSelect
    }
  }, [bookContentRef, canCopyContent])


  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (novel) {
      // Track page view with more details
      trackPageView('novel_read', { 
        novel_id: novel.id,
        novel_title: novel.title,
        chapter_number: currentChapter + 1,
        is_anonymous: !currentUser,
        session_id: localStorage.getItem('anonymous_session_id') || 'unknown'
      });

      // Track chapter read with more context
      trackChapterRead(novel.id, {
        title: novel.chapters[currentChapter].title,
        number: currentChapter + 1,
        total_chapters: novel.chapters.length,
        reader_id: currentUser?.uid || 'anonymous',
        genre: novel.genres?.[0] || 'unknown'
      });
    }

    return () => {
      const timeSpent = (Date.now() - startTime) / 1000;
      trackEngagementTime('novel_read', timeSpent);
    };
  }, [novel, currentChapter, currentUser]);

  useEffect(() => {
    if (novel && !currentUser) {
      trackAnonymousPageView({
        pageName: 'novel_read',
        novelId: novel.id,
        chapterIndex: currentChapter
      });
    }
  }, [novel, currentChapter, currentUser]);

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
  const paginateContentIntoPages = (paragraphs: string[], paragraphsPerPage = 6) => {
    const contentPages: string[][] = []
    for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
      contentPages.push(paragraphs.slice(i, i + paragraphsPerPage))
    }
    return contentPages
  }

  // Helper: Calculate total pages for a specific chapter
  const calculateChapterPages = (chapterIndex: number) => {
    if (!novel || chapterIndex >= novel.chapters.length) return 0
    const chapterContent = novel.chapters[chapterIndex]?.content || ""
    const formattedParagraphs = formatContent(chapterContent)
    // For previous chapters, we can't translate them, so use original content
    const contentPages = paginateContentIntoPages(formattedParagraphs, 6)
    return 1 + contentPages.length // 1 for title page + content pages
  }

  // Helper: Calculate the absolute page number across all chapters
  const calculateAbsolutePageNumber = () => {
    if (!novel) return 1

    let totalPreviousPages = 0
    // Sum up all pages from previous chapters
    for (let i = 0; i < currentChapter; i++) {
      totalPreviousPages += calculateChapterPages(i)
    }

    return totalPreviousPages + currentPage + 1 // +1 because currentPage is 0-indexed
  }

  // Prepare pages for the current chapter, including the title page
  const chapterContent = novel?.chapters[currentChapter]?.content || ""
  const formattedParagraphs = useMemo(() => formatContent(chapterContent), [chapterContent])
  
  // Translate content when language changes or chapter changes
  useEffect(() => {
    const translateChapterContent = async () => {
      console.log("Translation effect triggered:", { language, paragraphsCount: formattedParagraphs.length })
      
      if (!formattedParagraphs.length || language === "en") {
        console.log("Using original content (English or no content)")
        setTranslatedContent(formattedParagraphs)
        return
      }

      console.log("Starting translation...")
      setIsTranslating(true)
      try {
        const translated = await translateParagraphs(formattedParagraphs)
        console.log("Translation completed:", translated.length, "paragraphs")
        setTranslatedContent(translated)
      } catch (error) {
        console.error("Translation failed:", error)
        setTranslatedContent(formattedParagraphs)
      } finally {
        setIsTranslating(false)
      }
    }

    translateChapterContent()
  }, [formattedParagraphs, language, translateParagraphs])

  const contentPages = paginateContentIntoPages(translatedContent, 6) // 6 paragraphs per page
  const chapterPages: ("title" | string[])[] = []
  if (novel) {
    chapterPages.push("title") // First page is always the chapter title page
    contentPages.forEach((page) => chapterPages.push(page))
  }

  // Enhanced page navigation with chapter transitions
  const handlePageNavigation = (direction: "prev" | "next") => {
    const changeBookPage = (newPage: number) => {
      setPageFade(true)
      setTimeout(() => {
        setCurrentPage(newPage)
        setTimeout(() => setPageFade(false), 300)
      }, 300)
    }

    if (direction === "prev") {
      if (currentPage > 0) {
        // Navigate to previous page in current chapter
        changeBookPage(currentPage - 1)
      } else if (currentChapter > 0) {
        // Go to previous chapter's last page
        const prevChapter = currentChapter - 1
        const prevChapterContent = novel?.chapters[prevChapter]?.content || ""
        const prevFormattedParagraphs = formatContent(prevChapterContent)
        // For previous chapters, we can't translate them, so use original content
        const prevContentPages = paginateContentIntoPages(prevFormattedParagraphs, 6)
        const prevChapterPages = ["title", ...prevContentPages]
        const targetPage = prevChapterPages.length - 1

        // Set both chapter and page simultaneously with fade effect
        setPageFade(true)
        setTimeout(() => {
          setCurrentChapter(prevChapter)
          setCurrentPage(targetPage)
          setTimeout(() => setPageFade(false), 300)
        }, 300)
      }
    } else if (direction === "next") {
      if (currentPage < chapterPages.length - 1) {
        // Navigate to next page in current chapter
        changeBookPage(currentPage + 1)
      } else if (novel && currentChapter < novel.chapters.length - 1) {
        // Go to next chapter's title page with fade effect
        setPageFade(true)
        setTimeout(() => {
          setCurrentChapter(currentChapter + 1)
          setCurrentPage(0) // Title page
          setTimeout(() => setPageFade(false), 300)
        }, 300)
      }
    }
  }

  // Swipe handlers for book mode (debounced, with animation)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const now = Date.now()
      if (now - lastSwipeTime.current > 350) {
        lastSwipeTime.current = now
        handlePageNavigation("next")
      }
    },
    onSwipedRight: () => {
      const now = Date.now()
      if (now - lastSwipeTime.current > 350) {
        lastSwipeTime.current = now
        handlePageNavigation("prev")
      }
    },
    trackMouse: true,
  })

  // Check if navigation is possible
  const canNavigatePrev = currentPage > 0 || currentChapter > 0
  const canNavigateNext = currentPage < chapterPages.length - 1 || (novel && currentChapter < novel.chapters.length - 1)

  // Render current page content
  const renderCurrentPageContent = () => {
    if (!novel) return null
    const pageContent = chapterPages[currentPage]
    if (pageContent === "title") {
      // This is the chapter title page
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4 sm:px-8 py-8 sm:py-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight">
            {novel.chapters[currentChapter].title}
          </h2>
          <div className="w-16 sm:w-24 h-1 bg-purple-500 my-4 sm:my-6 rounded-full"></div>
          <p className="text-lg sm:text-xl md:text-2xl font-serif text-gray-300">{t("written_by")} {novel.authorName}</p>
        </div>
      )
    } else if (Array.isArray(pageContent)) {
      // This is a content page
      return (
        <div className="prose dark:prose-invert max-w-none mx-auto px-4 sm:px-6 pt-2 md:px-8">
          {pageContent.map((paragraph, idx) => (
            <div
              key={idx}
              className="mb-4 sm:mb-6 text-gray-300 leading-relaxed text-sm sm:text-base indent-4 sm:indent-8 text-justify font-serif"
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
      )
    }
    return (
      <div className="flex flex-col items-center justify-center h-60 text-gray-400">
        <BookOpen className="h-12 w-12 mb-4" />
        <span className="text-lg">{t("no_content")}</span>
      </div>
    )
  }

  useEffect(() => {
    const fetchNovel = async () => {
      if (!id) return

      try {
        setLoading(true)
        const novelDoc = await getDoc(doc(db, "novels", id))

        if (novelDoc.exists()) {
          const novelData = { id: novelDoc.id, ...novelDoc.data() } as Novel
          setNovel(novelData)

          if (novelData.hasGraphicContent && !hasAcknowledgedWarning) {
            setShowGraphicWarning(true)
          }

          // Get chapter from URL params
          const chapterParam = searchParams.get("chapter")
          if (chapterParam) {
            const chapterIndex = Number.parseInt(chapterParam, 10)
            if (chapterIndex >= 0 && chapterIndex < novelData.chapters.length) {
              setCurrentChapter(chapterIndex)
            }
          }
          if (currentUser) {
            await updateDoc(doc(db, "novels", id), {
              views: increment(1),
            })
          }
        } else {
          setError("Novel not found")
        }
      } catch (err) {
        console.error("Error fetching novel:", err)
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

  // Instead, add this modified useEffect that only resets the page when the chapter changes from URL params or initial load:

  useEffect(() => {
    // Only reset page if this is from URL params or initial load
    const chapterParam = searchParams.get("chapter")
    if (chapterParam) {
      setCurrentPage(0)
    }
  }, [currentChapter, searchParams])

  const organizeCommentsWithReplies = useCallback((allComments: Comment[]): Comment[] => {
    const topLevelComments = allComments.filter((comment) => !comment.parentId)
    
    // Recursive function to build nested replies
    const buildReplies = (parentId: string): Comment[] => {
      const directReplies = allComments
        .filter((comment) => comment.parentId === parentId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      
      return directReplies.map((reply) => ({
        ...reply,
        replies: buildReplies(reply.id)
      }))
    }
    
    return topLevelComments.map((comment) => ({
      ...comment,
      replies: buildReplies(comment.id)
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

      // Send notification to novel author when chapter is liked (not unliked)
      if (newLikeStatus && novel.authorId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          toUserId: novel.authorId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "chapter_like",
          novelId: novel.id,
          novelTitle: novel.title,
          chapterNumber: currentChapter + 1,
          chapterTitle: novel.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`,
          createdAt: new Date().toISOString(),
          read: false,
        })
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

      // Send notification to novel author if different from current user
      if (novel.authorId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          toUserId: novel.authorId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "novel_comment",
          novelId: novel.id,
          novelTitle: novel.title,
          commentContent: newComment.trim(),
          chapterNumber: currentChapter + 1,
          chapterTitle: novel.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`,
          createdAt: new Date().toISOString(),
          read: false,
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
      
      // Find the parent comment to get its author
      const existingComments = chapterDoc.data().comments || []
      const parentComment = existingComments.find((comment: Comment) => comment.id === parentId)
      const parentCommentAuthorId = parentComment?.userId
      
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
      const updatedComments = [...existingComments, reply]
      await updateDoc(chapterRef, {
        comments: updatedComments,
      })

      // Send notification to novel author if different from current user
      if (novel.authorId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          toUserId: novel.authorId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "novel_reply",
          novelId: novel.id,
          novelTitle: novel.title,
          commentContent: replyContent.trim(),
          parentId: parentId,
          chapterNumber: currentChapter + 1,
          chapterTitle: novel.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`,
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

      // Also notify the parent comment's author if they are not the novel author and not the current user
      if (
        parentCommentAuthorId &&
        parentCommentAuthorId !== novel.authorId &&
        parentCommentAuthorId !== currentUser.uid
      ) {
        await addDoc(collection(db, "notifications"), {
          toUserId: parentCommentAuthorId,
          fromUserId: currentUser.uid,
          fromUserName: currentUser.displayName || "Anonymous User",
          type: "comment_reply",
          novelId: novel.id,
          novelTitle: novel.title,
          commentContent: replyContent.trim(),
          parentId: parentId,
          chapterNumber: currentChapter + 1,
          chapterTitle: novel.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`,
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

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
      
      // Find the comment to get author info
      const targetComment = existingComments.find((comment: Comment) => comment.id === commentId)
      if (!targetComment) return
      
      const commentAuthorId = targetComment.userId
      
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
      
      // Send notification only when liking (not unliking) and only to comment author if different from current user
      if (!isLiked && commentAuthorId !== currentUser.uid) {
        // Check if notification already exists to prevent spam (check both read and unread)
        const notificationQuery = query(
          collection(db, "notifications"),
          where("toUserId", "==", commentAuthorId),
          where("fromUserId", "==", currentUser.uid),
          where("type", "==", "comment_like"),
          where("commentId", "==", commentId)
        )
        
        const existingNotifications = await getDocs(notificationQuery)
        
        // Only send notification if none exists (regardless of read status)
        if (existingNotifications.empty) {
          await addDoc(collection(db, "notifications"), {
            toUserId: commentAuthorId,
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || "Anonymous User",
            type: "comment_like",
            novelId: novel.id,
            novelTitle: novel.title,
            commentId: commentId,
            commentContent: targetComment.text,
            chapterNumber: currentChapter + 1,
            chapterTitle: novel.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`,
            createdAt: new Date().toISOString(),
            read: false,
          })
        }
      }
      
      const organizedComments = organizeCommentsWithReplies(updatedComments)
      setComments(organizedComments)
    } catch (error) {
      console.error("Error updating comment like:", error)
    }
  }

  const canDeleteComment = (comment: Comment) => {
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
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const GraphicContentWarning = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-red-500/30">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Content Warning</h3>
          <p className="text-gray-300 mb-6">
            This novel contains graphic or gory content that may not be suitable for all readers. Please proceed with
            caution.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowGraphicWarning(false)
                setHasAcknowledgedWarning(true)
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Continue
            </button>
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{t("loading_novel")}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300">
            {t("back_to_home")}
          </Link>
        </div>
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">{t("novel_not_found")}</p>
      </div>
    )
  }

  if (showGraphicWarning) {
    return <GraphicContentWarning />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Top navigation */}
      <div className="fixed top-0 right-0 z-50 p-4 bg-gradient-to-b from-gray-900/80 to-transparent w-full flex justify-between items-center">
        <LanguageSelector />
        <Link
          to={`/novel/${novel.id}`}
          className="p-2 rounded-full bg-gray-800/90 text-gray-300 hover:bg-gray-700/90 hover:text-white transition-colors shadow-lg backdrop-blur-sm"
          title={t("back_to_novel")}
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </Link>
      </div>

      {/* Main content area */}
      <div className="flex-grow py-2 sm:py-4 flex items-center justify-center">
        <div className="relative bg-gray-800 rounded-xl shadow-lg py-6 sm:py-9 px-3 sm:px-8 md:px-12 w-full max-w-4xl min-h-[500px] sm:min-h-[600px] mx-2 sm:mx-4 flex flex-col justify-between">
          {/* Chapter indicator */}
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 text-xs sm:text-sm">
            {t("chapter")} {currentChapter + 1}
            {isTranslating && (
              <div className="flex items-center mt-1 text-purple-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-1"></div>
                <span className="text-xs">Translating...</span>
              </div>
            )}
          </div>
          {/* Content */}
          <div
            {...swipeHandlers}
            className={`flex-grow flex flex-col justify-center items-center transition-opacity duration-300 ${
              pageFade ? "opacity-0" : "opacity-100"
            } ${canCopyContent ? "" : "select-none"}`}
            style={canCopyContent ? undefined : { userSelect: "none", WebkitUserSelect: "none" as any }}
            draggable={false}
            tabIndex={canCopyContent ? -1 : 0}
            onCopy={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onCut={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onPaste={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onContextMenu={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onMouseDown={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            ref={bookContentRef}
          >
            {renderCurrentPageContent()}
          </div>

          <div className="absolute top-4 left-4 text-xs text-gray-400 italic">{t("written_by")} {novel.authorName}</div>
          {/* Page navigation */}
          <div className="flex justify-between items-center w-full mt-4 sm:mt-6 text-sm">
            <button
              className={`p-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors ${
                !canNavigatePrev
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-purple-900 text-purple-200 hover:bg-purple-800"
              }`}
              disabled={!canNavigatePrev}
              onClick={() => handlePageNavigation("prev")}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700 text-gray-300 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap">
              {t("page")} {calculateAbsolutePageNumber()}
            </span>
            <button
              className={`p-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors ${
                !canNavigateNext
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-purple-900 text-purple-200 hover:bg-purple-800"
              }`}
              disabled={!canNavigateNext}
              onClick={() => handlePageNavigation("next")}
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Update FloatingActions component */}
      <div className="fixed bottom-4 sm:bottom-6 right-2 sm:right-6 flex flex-col items-end space-y-3 sm:space-y-4">
        <div className="flex flex-col items-center scale-90 sm:scale-100">
          <div
            onClick={handleChapterLike}
            className={`cursor-pointer transition-all transform hover:scale-110 ${
              !currentUser ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={currentUser ? t("like_chapter") : t("login_to_like")}
          >
            <Heart
              className={`h-6 sm:h-7 w-6 sm:w-7 ${chapterLiked ? "text-red-500 fill-current" : "text-gray-300"}`}
              fill={chapterLiked ? "currentColor" : "none"}
            />
          </div>
          <span className="text-xs sm:text-sm text-gray-300 mt-1">{chapterLikes}</span>
        </div>
        <div className="flex flex-col items-center scale-90 sm:scale-100">
          <div
            onClick={() => setShowCommentModal(true)}
            className={`cursor-pointer transition-all transform hover:scale-110 ${
              !currentUser ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={currentUser ? t("view_comments") : t("login_to_comment")}
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
          allComments={comments.flatMap(comment => [comment, ...(comment.replies || [])])}
        />
      )}
    </div>
  )
}

export default NovelRead
