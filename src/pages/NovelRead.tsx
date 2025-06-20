import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, setDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"

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
  comment: Comment;
  isReply?: boolean;
  currentUser: any;
  novel: Novel | null;
  handleCommentLike: (id: string, liked: boolean) => void;
  handleReplyToggle: (id: string) => void;
  canDeleteComment: (comment: Comment) => boolean;
  handleDeleteComment: (id: string) => void;
  replyingTo: string | null;
  replyContent: string;
  setReplyContent: (v: string) => void;
  handleReplySubmitDirect: (e: React.FormEvent, parentId: string) => void;
  setReplyingTo: (v: string | null) => void;
  deletingComment: string | null;
  getUserInitials: (name: string) => string;
  formatDate: (dateString: string) => string;
  replyInputRef: React.RefObject<HTMLInputElement | null>;
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

      {/* Reply Button - Only for top-level comments */}
      {!isReply && currentUser && (
        <button
          onClick={() => handleReplyToggle(comment.id)}
          className="inline-flex items-center text-xs text-gray-400 hover:text-purple-400 transition-colors"
        >
          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
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
            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
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
            onChange={e => setReplyContent(e.target.value)}
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
          <CommentItem key={reply.id} comment={reply} isReply={true} currentUser={currentUser} novel={novel} handleCommentLike={handleCommentLike} handleReplyToggle={handleReplyToggle} canDeleteComment={canDeleteComment} handleDeleteComment={handleDeleteComment} replyingTo={replyingTo} replyContent={replyContent} setReplyContent={setReplyContent} handleReplySubmitDirect={handleReplySubmitDirect} setReplyingTo={setReplyingTo} deletingComment={deletingComment} getUserInitials={getUserInitials} formatDate={formatDate} replyInputRef={replyInputRef} />
        ))}
      </div>
    )}
  </div>
)

interface CommentModalProps {
  comments: Comment[];
  currentUser: any;
  newComment: string;
  setNewComment: (v: string) => void;
  handleSubmitDirect: (e: React.FormEvent) => void;
  setShowCommentModal: (v: boolean) => void;
  CommentItem: React.FC<CommentItemProps>;
  novel: Novel | null;
  handleCommentLike: (id: string, liked: boolean) => void;
  handleReplyToggle: (id: string) => void;
  canDeleteComment: (comment: Comment) => boolean;
  handleDeleteComment: (id: string) => void;
  replyingTo: string | null;
  replyContent: string;
  setReplyContent: (v: string) => void;
  handleReplySubmitDirect: (e: React.FormEvent, parentId: string) => void;
  setReplyingTo: (v: string | null) => void;
  deletingComment: string | null;
  getUserInitials: (name: string) => string;
  formatDate: (dateString: string) => string;
  replyInputRef: React.RefObject<HTMLInputElement | null>;
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
}: CommentModalProps & { getUserInitials: (name: string) => string; formatDate: (dateString: string) => string; replyInputRef: React.RefObject<HTMLInputElement | null> }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowCommentModal(false)
        setNewComment("")
      }
    }}
  >
    <div
      className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">
          Comments ({comments.reduce((total: number, comment: Comment) => total + 1 + (comment.replies?.length || 0), 0)})
        </h3>
        <button onClick={() => { setShowCommentModal(false); setNewComment("") }} className="text-gray-400 hover:text-white">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              canDeleteComment={(comment) => Boolean(canDeleteComment(comment))}
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
              onChange={e => setNewComment(e.target.value)}
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

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentChapter])

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

  const canDeleteComment = (comment: Comment) => {
    if (!currentUser) return false
    // User can delete their own comments or novel author can delete any comment
    return comment.userId === currentUser.uid || (novel && novel.authorId === currentUser.uid)
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

  // Improved function to break content into readable paragraphs
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

  const FloatingActions = () => (
    <div className="fixed bottom-6 right-2 md:right-6 flex flex-col items-end space-y-4">
      {/* Like Button with Count */}
      <div className="flex flex-col items-center">
        <div
          onClick={handleChapterLike}
          className={`cursor-pointer transition-all transform hover:scale-110 ${
            !currentUser ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={currentUser ? "Like this chapter" : "Login to like"}
        >
          <svg
            className={`h-7 w-7 ${chapterLiked ? "text-red-500 fill-current" : "text-gray-300"}`}
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
        </div>
        <span className="text-sm text-gray-300 mt-1">{chapterLikes}</span>
      </div>

      {/* Comment Button */}
      <div className="flex flex-col items-center">
        <div
          onClick={() => setShowCommentModal(true)}
          className={`cursor-pointer transition-all transform hover:scale-110 ${
            !currentUser ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={currentUser ? "View comments" : "Login to comment"}
        >
          <svg
            className={`h-7 w-7 ${comments.length > 0 ? "text-purple-500" : "text-gray-300"}`}
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
        </div>
        <span className="text-sm text-gray-300 mt-1">
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
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-white">Novel Not Found</h3>
          <p className="mt-2 text-gray-400">{error}</p>
          <div className="mt-6">
            <Link
              to="/novels"
              className="inline-flex items-center text-sm text-purple-400 font-medium hover:text-purple-300"
            >
              ← Browse Novels
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header with Logo and Title */}
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center">
        <div className="flex items-center justify-center mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-4">{novel.title}</h1>
        <div className="flex items-center space-x-4">
          <Link
            to={`/novel/${novel.id}`}
            className="inline-flex items-center text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Overview
          </Link>
        </div>
      </div>

      {/* Chapter Content */}
      <div className="flex-grow py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gray-800 rounded-xl shadow-lg py-9 px-3 md:px-12">
            <h2 className="text-xl font-bold mb-8 text-white text-center border-b border-gray-700 pb-4">
              {novel.chapters[currentChapter].title}
            </h2>

            <div className="prose dark:prose-invert max-w-none mx-auto">
              {formatContent(novel.chapters[currentChapter].content).map((paragraph, index) => (
                <p key={index} className="mb-6 text-gray-300 leading-relaxed text-base indent-8 text-justify">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center mt-12 space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentChapter === 0
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-900 text-purple-200 hover:bg-purple-800"
                }`}
                disabled={currentChapter === 0}
                onClick={() => setCurrentChapter((prev) => Math.max(0, prev - 1))}
              >
                <div className="flex items-center">
                  <svg
                    className="mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Previous Chapter
                </div>
              </button>

              <span className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm font-medium">
                Chapter {currentChapter + 1} of {novel.chapters.length}
              </span>

              <button
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                  currentChapter === novel.chapters.length - 1
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-900 text-purple-200 hover:bg-purple-800"
                }`}
                disabled={currentChapter === novel.chapters.length - 1}
                onClick={() => setCurrentChapter((prev) => Math.min(novel.chapters.length - 1, prev + 1))}
              >
                <div className="flex items-center">
                  Next Chapter
                  <svg
                    className="ml-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <FloatingActions />
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
          canDeleteComment={(comment) => Boolean(canDeleteComment(comment))}
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
