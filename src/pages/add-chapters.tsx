"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"

interface Chapter {
  title: string
  content: string
}

const AddChapters = () => {
  const { id: novelId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [novel, setNovel] = useState<Novel | null>(null)
  const [newChapters, setNewChapters] = useState<Chapter[]>([{ title: "", content: "" }])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    const fetchNovel = async () => {
      if (!novelId) {
        setError("Novel ID is required")
        setLoading(false)
        return
      }

      if (!currentUser) {
        setError("You must be logged in to add chapters")
        setLoading(false)
        return
      }

      try {
        const novelDoc = await getDoc(doc(db, "novels", novelId))
        if (novelDoc.exists()) {
          const novelData = { id: novelDoc.id, ...novelDoc.data() } as Novel

          // Check if current user is the author
          if (novelData.authorId !== currentUser.uid) {
            setError("You are not authorized to add chapters to this novel.")
            setLoading(false)
            return
          }

          setNovel(novelData)
        } else {
          setError("Novel not found.")
        }
      } catch (err) {
        console.error("Error fetching novel:", err)
        setError("Failed to load novel.")
      } finally {
        setLoading(false)
      }
    }

    fetchNovel()
  }, [novelId, currentUser])

  const handleChapterTitleChange = (index: number, title: string) => {
    const updatedChapters = [...newChapters]
    updatedChapters[index].title = title
    setNewChapters(updatedChapters)
  }

  const handleChapterContentChange = (index: number, content: string) => {
    const updatedChapters = [...newChapters]
    updatedChapters[index].content = content
    setNewChapters(updatedChapters)
  }

  const addChapter = () => {
    setNewChapters([...newChapters, { title: "", content: "" }])
  }

  const removeChapter = (index: number) => {
    if (newChapters.length > 1) {
      const updatedChapters = [...newChapters]
      updatedChapters.splice(index, 1)
      setNewChapters(updatedChapters)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novelId || !novel) return

    // Validate chapters
    const validChapters = newChapters.filter((chapter) => chapter.title.trim() && chapter.content.trim())

    if (validChapters.length === 0) {
      setError("Please add at least one chapter with both title and content.")
      return
    }

    if (validChapters.length !== newChapters.length) {
      setError("All chapters must have both title and content.")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      // Update the novel with new chapters
      await updateDoc(doc(db, "novels", novelId), {
        chapters: arrayUnion(...validChapters),
        updatedAt: new Date().toISOString(),
      })

      setSuccess(`Successfully added ${validChapters.length} new chapter(s)!`)

      // Reset form
      setNewChapters([{ title: "", content: "" }])

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/novel/${novelId}`)
      }, 2000)
    } catch (err) {
      console.error("Error adding chapters:", err)
      setError("Failed to add chapters. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (error && !novel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link
          to="/"
          className="inline-flex items-center mt-4 text-purple-400 hover:text-purple-300"
        >
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/novel/${novelId}`}
          className="inline-flex items-center text-purple-400 hover:text-purple-300 my-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Novel
        </Link>
        <h1 className="text-3xl font-bold text-white">Add New Chapters</h1>
        <p className="text-gray-400 mt-2">
          Continue your story by adding new chapters to "{novel?.title}"
        </p>
      </div>

      {/* Novel Info */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-start space-x-4">
          {novel?.coverImage && (
            <img
              src={novel.coverImage || "/placeholder.svg"}
              alt={novel.title}
              className="w-20 h-28 object-cover rounded-lg shadow-md"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{novel?.title}</h2>
            <p className="text-gray-400 mt-1">By {novel?.authorName}</p>
            <p className="text-sm text-gray-400 mt-2">
              Current chapters: {novel?.chapters?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Add Chapters Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">New Chapters</h2>
            <button
              type="button"
              onClick={addChapter}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Chapter
            </button>
          </div>

          {newChapters.map((chapter, index) => {
            const chapterNumber = (novel?.chapters?.length || 0) + index + 1
            return (
              <div
                key={index}
                className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-purple-500"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">New Chapter {chapterNumber}</h3>
                  {newChapters.length > 1 && (
                    <button
                      type="button"
                      className="inline-flex items-center text-red-400 hover:text-red-300 transition-colors"
                      onClick={() => removeChapter(index)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    htmlFor={`chapter-title-${index}`}
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Chapter Title
                  </label>
                  <input
                    id={`chapter-title-${index}`}
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    value={chapter.title}
                    onChange={(e) => handleChapterTitleChange(index, e.target.value)}
                    placeholder={`Enter Chapter ${chapterNumber} title`}
                    required
                  />
                </div>

                <div>
                <label
                  htmlFor={`chapter-content-${index}`}
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
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
                  value={chapter.content}
                  onChange={(val) => handleChapterContentChange(index, val || "")}
                  height={250}
                  textareaProps={{
                    id: `chapter-content-${index}`,
                    required: true,
                    placeholder: "Write your chapter content here..."
                  }}
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]]
                  }}
                  preview={showPreview ? 'edit' : 'preview'}
                />
              </div>
              </div>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link
            to={`/novel/${novelId}`}
            className="inline-flex items-center px-6 py-3 border border-gray-600 text-base font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? (
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
                Adding Chapters...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add {newChapters.length} Chapter{newChapters.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddChapters