"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } from "firebase/firestore"
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
  const [liked, setLiked] = useState<boolean>(false)
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

          // Get chapter from URL params
          const chapterParam = searchParams.get("chapter")
          if (chapterParam) {
            const chapterIndex = Number.parseInt(chapterParam, 10)
            if (chapterIndex >= 0 && chapterIndex < novelData.chapters.length) {
              setCurrentChapter(chapterIndex)
            }
          }

          // Increment view count only once per session
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
  }, [id, currentUser, searchParams])

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

      {/* Novel Info Footer */}
      <div className="bg-gray-800 shadow-md py-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              disabled={!currentUser}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                liked ? "bg-red-900 text-red-300" : "bg-gray-700 text-gray-300"
              } ${!currentUser ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"}`}
            >
              <svg
                className={`h-4 w-4 ${liked ? "text-red-500 fill-current" : "text-gray-400"}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{novel.likes} Likes</span>
            </button>
          </div>
          <div className="flex items-center space-x-1 text-gray-400">
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{novel.views} Views</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-400">
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>By {novel.authorName}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {novel.genres.map((genre, index) => (
              <span key={index} className="px-3 py-1 bg-gray-700 text-xs rounded-full text-gray-200">
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NovelRead
