"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, setDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"

const NovelRead = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [currentChapter, setCurrentChapter] = useState<number>(0)
  const { currentUser } = useAuth()
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [comments, setComments] = useState<
    Array<{ id: string; text: string; userId: string; userName: string; createdAt: string }>
  >([])
  const [newComment, setNewComment] = useState("")
  const [chapterLiked, setChapterLiked] = useState(false)
  const [chapterLikes, setChapterLikes] = useState(0)

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
    setShowCommentModal(false)
    setNewComment("")

    const fetchChapterData = async () => {
  if (!novel) return

  try {
    const chapterRef = doc(db, "novels", novel.id, "chapters", currentChapter.toString())
    const chapterDoc = await getDoc(chapterRef)

    if (chapterDoc.exists()) {
      const chapterData = chapterDoc.data()
      setChapterLiked(
        currentUser ? chapterData.chapterLikedBy?.includes(currentUser.uid) || false : false
      )
      setChapterLikes(chapterData.chapterLikes || 0)
      setComments(chapterData.comments || [])
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
      const comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        createdAt: new Date().toISOString(),
      }

      if (!chapterDoc.exists()) {
        // Create the chapter document if it doesn't exist
        await setDoc(chapterRef, {
          chapterLikes: 0,
          chapterLikedBy: [],
          comments: [comment],
        })
      } else {
        // Update existing document
        await updateDoc(chapterRef, {
          comments: arrayUnion(comment),
        })
      }

      setComments((prev) => [...prev, comment])
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (newComment.trim()) {
      handleAddComment()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewComment(value)
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
        <span className="text-sm text-gray-300 mt-1">{comments.length}</span>
      </div>
    </div>
  )

  const CommentModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowCommentModal(false)
        }
      }}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Comments</h3>
          <button onClick={() => setShowCommentModal(false)} className="text-gray-400 hover:text-white">
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
              <div key={comment.id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                      {currentUser?.photoURL ? (
                        <img
                          src={currentUser.photoURL || "/placeholder.svg"}
                          alt={comment.userName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getUserInitials(comment.userName)}
                        </div>
                    )}
                  </div>
                  <span className="font-medium text-white">{comment.userName}</span>
                  </div>

                  <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-300">{comment.text}</p>
              </div>
            ))
          )}
        </div>

        {currentUser && (
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }
                  e.stopPropagation()
                }}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoComplete="off"
                autoFocus
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
      {showCommentModal && <CommentModal />}
    </div>
  )
}

export default NovelRead
