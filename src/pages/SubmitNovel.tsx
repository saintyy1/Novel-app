"use client"

import { useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { collection, addDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"

const SubmitNovel = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [summary, setSummary] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [chapters, setChapters] = useState([{ title: "", content: "" }])
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const availableGenres = [
    "Fantasy", "Sci-Fi", "Romance", "Mystery", "Horror",
    "Adventure", "Thriller", "Historical", "Comedy", "Drama"
  ]

  const handleGenreChange = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre))
    } else {
      setGenres([...genres, genre])
    }
  }

  const handleChapterTitleChange = (index: number, title: string) => {
    const newChapters = [...chapters]
    newChapters[index].title = title
    setChapters(newChapters)
  }

  const handleChapterContentChange = (index: number, content: string) => {
    const newChapters = [...chapters]
    newChapters[index].content = content
    setChapters(newChapters)
  }

  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "" }])
  }

  const removeChapter = (index: number) => {
    if (chapters.length > 1) {
      const newChapters = [...chapters]
      newChapters.splice(index, 1)
      setChapters(newChapters)
    }
  }

  const MAX_WIDTH = 600

  const resizeAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string

        img.onload = () => {
          const canvas = document.createElement('canvas')
          const scaleFactor = MAX_WIDTH / img.width
          canvas.width = MAX_WIDTH
          canvas.height = img.height * scaleFactor

          const ctx = canvas.getContext('2d')
          if (!ctx) return reject("Canvas context not found")

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          const base64 = canvas.toDataURL('image/jpeg', 0.7)
          resolve(base64)
        }

        img.onerror = reject
      }

      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (file.size > 10 * 1024 * 1024) {
        setError("Cover image must be less than 10MB")
        return
      }

      if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
        setError("Cover image must be JPEG, PNG or WebP format")
        return
      }

      try {
        const base64 = await resizeAndConvertToBase64(file)
        setCoverImage(base64)
        setCoverPreview(base64)
        setError("")
      } catch (err) {
        console.error("Image processing failed:", err)
        setError("Failed to process image")
      }
    }
  }

  const removeCoverImage = () => {
    setCoverImage(null)
    setCoverPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (genres.length === 0) {
      return setError("Please select at least one genre")
    }

    if (chapters.some((chapter) => !chapter.content.trim())) {
      return setError("All chapters must have content")
    }

    if (coverImage && coverImage.length > 4 * 1024 * 1024) { // 4MB in base64
      setError("Processed cover image is too large. Please try a smaller image.");
      return;
    }

    try {
      setLoading(true)
      setError("")

      await addDoc(collection(db, "novels"), {
        title,
        description,
        summary,
        genres,
        chapters,
        authorId: currentUser?.uid,
        authorName: currentUser?.displayName,
        isAIGenerated: false,
        published: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coverImage: coverImage || null, // base64 string
        likes: 0,
        views: 0,
      })

      navigate("/profile")
      alert("Your novel has been submitted for review!")
    } catch (error) {
      console.error("Error submitting novel:", error)
      setError("Failed to submit novel. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to submit a novel</h2>
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
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mt-2 mb-8 text-[#E0E0E0]">Submit Your Novel</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-300 border-b border-gray-700 pb-2">
            Novel Details
          </h2>

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter your novel's title"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <input
              id="description"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Enter your novel's description"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="summary" className="block text-sm font-medium text-gray-300 mb-1">
              Summary
            </label>
            <textarea
              id="summary"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors min-h-[120px]"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              placeholder="Write a compelling summary of your novel"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cover Image (Optional)
            </label>
            <div className="mt-1 flex items-start space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleCoverImageChange}
                  className="block w-full text-sm text-gray-400
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-medium
                           file:bg-purple-900 file:text-purple-200
                           hover:file:bg-purple-800
                           cursor-pointer"
                />
                <p className="mt-1 text-xs text-gray-400">
                  JPEG, PNG or WebP. Max 5MB. Recommended size: 800x600px.
                </p>
              </div>
              {coverPreview && (
                <div className="relative">
                  <img
                    src={coverPreview || "/placeholder.svg"}
                    alt="Cover preview"
                    className="h-32 w-24 object-cover rounded-md shadow-md border border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    aria-label="Remove cover image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genres (select at least one)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
              {availableGenres.map((genre) => (
                <label
                  key={genre}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border ${genres.includes(genre)
                      ? "bg-purple-900/40 border-purple-700 text-purple-300"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    } cursor-pointer transition-colors text-sm`}
                >
                  <input
                    type="checkbox"
                    checked={genres.includes(genre)}
                    onChange={() => handleGenreChange(genre)}
                    className="sr-only"
                  />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Chapters</h2>
            <button
              type="button"
              onClick={addChapter}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Chapter
            </button>
          </div>

          {chapters.map((chapter, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-purple-500"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Chapter {index + 1}</h3>
                {chapters.length > 1 && (
                  <button
                    type="button"
                    className="inline-flex items-center text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => removeChapter(index)}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
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
                  required
                  placeholder={`Enter Chapter ${index + 1} title`}
                />
              </div>

              <div>
                <label
                  htmlFor={`chapter-content-${index}`}
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Chapter Content
                </label>
                <textarea
                  id={`chapter-content-${index}`}
                  className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors min-h-[250px]"
                  value={chapter.content}
                  onChange={(e) => handleChapterContentChange(index, e.target.value)}
                  required
                  placeholder="Write your chapter content here..."
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
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
                Submitting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Submit Novel
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SubmitNovel