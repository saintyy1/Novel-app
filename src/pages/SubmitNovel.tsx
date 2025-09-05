"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { collection, doc, setDoc } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"
import { db, storage } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"

const SubmitNovel = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [summary, setSummary] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [hasGraphicContent, setHasGraphicContent] = useState<boolean>(false)
  const [chapters, setChapters] = useState([{ title: "", content: "" }])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPreview, setShowPreview] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const availableGenres = [
    "Fantasy",
    "Sci-Fi",
    "Romance",
    "Mystery",
    "Horror",
    "Adventure",
    "Thriller",
    "Historical",
    "Comedy",
    "Drama",
    "Fiction",
    "Dystopian",
  ]

  const handleGenreChange = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre))
    } else {
      setGenres([...genres, genre])
    }
  }

  const countSentences = (text: string): number => {
    // Match sentences ending with ., !, or ? followed by a space or end of string
    const sentences = text.match(/[^.!?]+[.!?](?:\s|$)/g) || []
    return sentences.length
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value
    const sentences = countSentences(newDescription)

    if (sentences > 1) {
      setError("Description must not exceed one sentence")
      return
    }

    setError("")
    setDescription(newDescription)
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

  // Resize image under 1MB
  async function resizeUnder1MB(file: File): Promise<Blob> {
    const maxBytes = 1 * 1024 * 1024
    const img = await loadImage(file)

    let quality = 0.9
    let width = img.width
    let height = img.height
    let blob: Blob | null = null

    do {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not supported")
      ctx.drawImage(img, 0, 0, width, height)

      const newBlob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), file.type, quality))

      if (newBlob.size > maxBytes) {
        if (quality > 0.5) {
          quality -= 0.05
        } else {
          width *= 0.9
          height *= 0.9
        }
      } else {
        blob = newBlob
        break
      }
    } while (true)

    return blob!
  }

  // Generate small thumbnail
  async function generateSmallBlob(file: File, maxWidth = 200, maxHeight = 300): Promise<Blob> {
    const img = await loadImage(file)

    let width = img.width
    let height = img.height

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width
        width = maxWidth
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height
        height = maxHeight
      }
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(img, 0, 0, width, height)

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.7))
  }

  // Load an image from file
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate type
      if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
        setError("Cover image must be JPEG, PNG or WebP format")
        return
      }

      try {
      // Just create a preview and store the file
      const reader = new FileReader()
      reader.onload = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setSelectedFile(file)
      setError("")
    } catch (err) {
      console.error("Image preview failed:", err)
      setError("Failed to preview image")
    }
    }
  }
  
  const removeCoverImage = () => {
  setCoverPreview(null)
  setSelectedFile(null)
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

    if (countSentences(description) > 1) {
      setError("Description must not exceed one sentence")
      return
    }

    try {
    setLoading(true)
    setError("")

    let coverUrl = null
    let coverSmallUrl = null
    const docRef = doc(collection(db, "novels"))

    // Only process image if one was selected
    if (selectedFile) {
      try {
        const resizedBlob = await resizeUnder1MB(selectedFile)
        const smallBlob = await generateSmallBlob(selectedFile)

        // Upload to Firebase Storage with the document ID
        const coverRef = ref(storage, `covers-large/${docRef.id}.jpg`)
        const coverSmallRef = ref(storage, `covers-small/${docRef.id}.jpg`)

        await uploadBytes(coverRef, resizedBlob)
        await uploadBytes(coverSmallRef, smallBlob)

        coverUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/covers-large/${docRef.id}.jpg`
        coverSmallUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/covers-small/${docRef.id}.jpg`
      } catch (err) {
        console.error("Image processing failed:", err)
        setError("Failed to process image")
        setLoading(false)
        return
      }
    }

      await setDoc(docRef, {
        title,
        description,
        summary,
        genres,
        hasGraphicContent,
        chapters,
        authorId: currentUser?.uid,
        authorName: currentUser?.displayName,
        isPromoted: false,
        published: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coverImage: coverUrl || null,
        coverSmallImage: coverSmallUrl || null,
        likes: 0,
        views: 0,
      })

      navigate(`/profile/${currentUser?.uid}`)
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
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-300 border-b border-gray-700 pb-2">Novel Details</h2>

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
              Description (max 1 sentence)
            </label>
            <input
              id="description"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              value={description}
              onChange={handleDescriptionChange}
              required
              placeholder="Write a brief description of your novel"
            />
            <p className="mt-1 text-xs text-gray-400">{`${countSentences(description)} of 1 sentences used`}</p>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Cover Image (Optional)</label>
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
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG or WebP. Max 1MB. Recommended size: 800x600px.</p>
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Genres (select at least one)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
              {availableGenres.map((genre) => (
                <label
                  key={genre}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border ${
                    genres.includes(genre)
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Does your novel contain graphic or gory content?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="graphicContent"
                  value="yes"
                  checked={hasGraphicContent === true}
                  onChange={() => setHasGraphicContent(true)}
                  className="mr-2 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-gray-300">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="graphicContent"
                  value="no"
                  checked={hasGraphicContent === false}
                  onChange={() => setHasGraphicContent(false)}
                  className="mr-2 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-gray-300">No</span>
              </label>
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
            <div key={index} className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-purple-500">
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
                <label htmlFor={`chapter-title-${index}`} className="block text-sm font-medium text-gray-300 mb-1">
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
                <label htmlFor={`chapter-content-${index}`} className="block text-sm font-medium text-gray-300 mb-1">
                  Chapter Content
                </label>
                <button
                  type="button"
                  className="mb-2 px-3 py-1 rounded bg-gray-700 text-gray-200 text-xs hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onClick={() => setShowPreview((prev) => !prev)}
                >
                  {showPreview ? "Show Preview" : "Hide Preview"}
                </button>
                <MDEditor
                  value={chapter.content}
                  onChange={(val) => handleChapterContentChange(index, val || "")}
                  height={250}
                  textareaProps={{
                    id: `chapter-content-${index}`,
                    required: true,
                    placeholder: "Write your chapter content here...",
                  }}
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                  preview={showPreview ? "edit" : "preview"}
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
                  className="animate-spin ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
