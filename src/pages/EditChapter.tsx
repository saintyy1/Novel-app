"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"

const EditChapter = () => {
  const { id: novelId, chapterIndex } = useParams<{ id: string; chapterIndex: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [novel, setNovel] = useState<Novel | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterContent, setChapterContent] = useState("")
  const [originalTitle, setOriginalTitle] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const chapterIdx = chapterIndex ? Number.parseInt(chapterIndex, 10) : 0

  useEffect(() => {
    const fetchNovelAndChapter = async () => {
      if (!novelId || chapterIndex === undefined) {
        setError("Novel ID and chapter index are required")
        setLoading(false)
        return
      }

      if (!currentUser) {
        setError("You must be logged in to edit chapters")
        setLoading(false)
        return
      }

      try {
        const novelDoc = await getDoc(doc(db, "novels", novelId))
        if (novelDoc.exists()) {
          const novelData = { id: novelDoc.id, ...novelDoc.data() } as Novel

          // Check if current user is the author
          if (novelData.authorId !== currentUser.uid) {
            setError("You are not authorized to edit chapters of this novel.")
            setLoading(false)
            return
          }

          // Check if chapter index is valid
          if (chapterIdx < 0 || chapterIdx >= novelData.chapters.length) {
            setError("Chapter not found.")
            setLoading(false)
            return
          }

          const chapter = novelData.chapters[chapterIdx]
          setNovel(novelData)
          setChapterTitle(chapter.title)
          setChapterContent(chapter.content)
          setOriginalTitle(chapter.title)
          setOriginalContent(chapter.content)
        } else {
          setError("Novel not found.")
        }
      } catch (err) {
        console.error("Error fetching novel:", err)
        setError("Failed to load novel and chapter.")
      } finally {
        setLoading(false)
      }
    }

    fetchNovelAndChapter()
  }, [novelId, chapterIndex, currentUser, chapterIdx])

  // Check for changes
  useEffect(() => {
    const titleChanged = chapterTitle !== originalTitle
    const contentChanged = chapterContent !== originalContent
    setHasChanges(titleChanged || contentChanged)
  }, [chapterTitle, chapterContent, originalTitle, originalContent])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novelId || !novel) return

    // Validate input
    if (!chapterTitle.trim()) {
      setError("Chapter title is required.")
      showErrorToast("Chapter title is required.")
      return
    }

    if (!chapterContent.trim()) {
      setError("Chapter content is required.")
      showErrorToast("Chapter content is required.")
      return
    }

    if (!hasChanges) {
      showErrorToast("No changes to save.")
      return
    }

    try {
      setSaving(true)
      setError("")

      // Create updated chapters array
      const updatedChapters = [...novel.chapters]
      updatedChapters[chapterIdx] = {
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
      }

      // Update the novel with modified chapter
      await updateDoc(doc(db, "novels", novelId), {
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setOriginalTitle(chapterTitle.trim())
      setOriginalContent(chapterContent.trim())
      setHasChanges(false)

      showSuccessToast("Chapter updated successfully!")

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/novel/${novelId}`)
      }, 1500)
    } catch (err) {
      console.error("Error updating chapter:", err)
      const errorMessage = "Failed to update chapter. Please try again."
      setError(errorMessage)
      showErrorToast(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave without saving?")
      if (!confirmLeave) return
    }
    navigate(`/novel/${novelId}`)
  }

  const handleReset = () => {
    if (hasChanges) {
      const confirmReset = window.confirm("Are you sure you want to reset all changes?")
      if (!confirmReset) return
    }
    setChapterTitle(originalTitle)
    setChapterContent(originalContent)
  }

  const getFirebaseDownloadUrl = (url: string) => {
    if (!url || !url.includes("firebasestorage.app")) {
      return url
    }

    try {
      // Convert Firebase Storage URL to download URL format that bypasses CORS
      const urlParts = url.split("/")
      const bucketName = urlParts[3] // Extract bucket name
      const filePath = urlParts.slice(4).join("/") // Extract file path

      // Create download URL format that doesn't require CORS
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    } catch (error) {
      console.log(`[v0] Error converting Firebase URL: ${error}`)
      return url
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (error && !novel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
        <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300">
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link to={`/novel/${novelId}`} className="inline-flex items-center text-purple-400 hover:text-purple-300 my-4">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Novel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Chapter</h1>
            <p className="text-gray-400 mt-2">
              Editing Chapter {chapterIdx + 1} of "{novel?.title}"
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center text-yellow-400 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Novel Info */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-start space-x-4">
          {novel?.coverImage && (
            <img
              src={getFirebaseDownloadUrl(novel.coverImage || "/placeholder.svg")}
              alt={novel.title}
              className="w-20 h-28 object-cover rounded-lg shadow-md"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{novel?.title}</h2>
            <p className="text-gray-400 mt-1">By {novel?.authorName}</p>
            <p className="text-sm text-gray-400 mt-2">Total chapters: {novel?.chapters?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Edit Chapter Form */}
      <form onSubmit={handleSave}>
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Chapter {chapterIdx + 1}</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="chapter-title" className="block text-sm font-medium text-gray-300 mb-2">
              Chapter Title
            </label>
            <input
              id="chapter-title"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Enter chapter title"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="chapter-content" className="block text-sm font-medium text-gray-300 mb-2">
              Chapter Content
            </label>
            <button
              type="button"
              className="mb-2 px-3 py-1 rounded bg-gray-700 text-gray-200 text-xs hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              onClick={() => setShowPreview((prev) => !prev)}
            >
              {showPreview ? 'Show Preview' : 'Hide Preview'}
            </button>
            <MDEditor
              value={chapterContent}
              onChange={(val) => setChapterContent(val || "")}
              height={400}
              textareaProps={{
                id: "chapter-content",
                required: true,
                placeholder: "Write your chapter content here..."
              }}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]]
              }}
              preview={showPreview ? 'edit' : 'preview'}
            />
            <div className="mt-2 flex justify-between text-sm text-gray-400">
              <span>Characters: {chapterContent.length}</span>
              <span>
                Words: {chapterContent.trim().split(/\s+/).filter((word) => word.length > 0).length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-600 text-base font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving Changes...
              </>
            ) : (
              <div className="inline-flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Save Changes
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditChapter
