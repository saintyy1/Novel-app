"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { collection, doc, setDoc } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"
import { db, storage } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import SEOHead from "../components/SEOHead"

const SubmitPoem = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  const availableGenres = [
    "Romantic",
    "Nature",
    "Free Verse",
    "Haiku",
    "Sonnet",
    "Epic",
    "Lyric",
    "Narrative",
    "Limerick",
    "Ballad",
    "Elegy",
    "Ode",
  ]

  // Count lines and words
  const lineCount = content.split('\n').length
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const stanzaCount = content.trim() ? content.split(/\n\s*\n/).filter(s => s.trim()).length : 0

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

    if (!content.trim()) {
      return setError("Please write your poem content")
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
      const docRef = doc(collection(db, "poems"))

      // Only process image if one was selected
      if (selectedFile) {
        try {
          const resizedBlob = await resizeUnder1MB(selectedFile)
          const smallBlob = await generateSmallBlob(selectedFile)

          // Upload to Firebase Storage with the document ID
          const coverRef = ref(storage, `poem-covers-large/${docRef.id}.jpg`)
          const coverSmallRef = ref(storage, `poem-covers-small/${docRef.id}.jpg`)

          await uploadBytes(coverRef, resizedBlob)
          await uploadBytes(coverSmallRef, smallBlob)

          coverUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/poem-covers-large/${docRef.id}.jpg`
          coverSmallUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/poem-covers-small/${docRef.id}.jpg`
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
        content,
        genres,
        poetId: currentUser?.uid,
        poetName: currentUser?.displayName,
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
      alert("Your poem has been submitted for review!")
    } catch (error) {
      console.error("Error submitting poem:", error)
      setError("Failed to submit poem. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to submit a poem</h2>
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
    <div className="max-w-6xl mx-auto py-8">
      <SEOHead
        title="Submit Your Poem - NovlNest"
        description="Share your poetry with the world on NovlNest. Submit your poems and connect with readers who appreciate your art."
        keywords="submit poem, publish poetry, creative writing, share poems, poetry platform, poet tools, NovlNest"
        url="https://novlnest.com/submit-poem"
        canonicalUrl="https://novlnest.com/submit-poem"
      />

      {/* Header with poetic styling */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-purple-400 mb-3">
            Share Your Poetry
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm italic">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Let your words touch hearts</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Column - Form */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-6 border border-rose-900/20">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-rose-900/30">
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 className="text-xl font-serif font-bold text-rose-300">Compose</h2>
            </div>

            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-rose-200/90 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                Title
              </label>
              <input
                id="title"
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-rose-900/30 bg-gray-900/50 text-white font-serif text-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Untitled Poem"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-rose-200/90 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Description (one sentence)
              </label>
              <input
                id="description"
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-rose-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                value={description}
                onChange={handleDescriptionChange}
                required
                placeholder="Capture the essence in one line..."
              />
              <p className="mt-1 text-xs text-rose-300/60">{`${countSentences(description)} of 1 sentences used`}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-rose-200/90 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Your Poem
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                  {showPreview ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Show Preview
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="content"
                className="w-full px-4 py-3 rounded-lg border border-rose-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all min-h-[400px] font-serif leading-relaxed resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Let your verses flow...&#10;&#10;Each line, a thought&#10;Each stanza, a feeling&#10;Each word, a piece of your soul"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-rose-300/60">
                <div className="flex items-center gap-4">
                  <span>{lineCount} lines</span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{stanzaCount} stanza{stanzaCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-rose-200/90 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Cover Image (Optional)
              </label>
              <div className="mt-1 flex flex-col gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleCoverImageChange}
                  className="block w-full text-sm text-rose-200/70
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-lg file:border-0
                           file:text-sm file:font-medium
                           file:bg-rose-900/40 file:text-rose-200
                           hover:file:bg-rose-800/60
                           cursor-pointer transition-all"
                />
                {coverPreview && (
                  <div className="relative inline-block">
                    <img
                      src={coverPreview || "/placeholder.svg"}
                      alt="Cover preview"
                      className="h-32 w-full object-cover rounded-lg shadow-lg border border-rose-900/30"
                    />
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg hover:bg-rose-600 transition-colors"
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

            <div>
              <label className="block text-sm font-medium text-rose-200/90 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                Poetry Style (select at least one)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableGenres.map((genre) => (
                  <label
                    key={genre}
                    className={`flex items-center justify-center px-3 py-2.5 rounded-lg border-2 ${genres.includes(genre)
                        ? "bg-gradient-to-br from-rose-900/40 to-pink-900/40 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-900/20"
                        : "bg-gray-900/30 border-rose-900/20 text-gray-400 hover:bg-gray-900/50 hover:border-rose-800/30"
                      } cursor-pointer transition-all text-sm font-medium`}
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

          {/* Right Column - Preview */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl shadow-xl p-6 border border-pink-900/20">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-pink-900/30">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h2 className="text-xl font-serif font-bold text-pink-300">Preview</h2>
            </div>

            {showPreview ? (
              <div className="min-h-[500px]">
                {content ? (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-8 border border-pink-900/20 shadow-inner">
                    {title && (
                      <h3 className="text-2xl font-serif font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-pink-300">
                        {title}
                      </h3>
                    )}
                    <div className="text-gray-200 whitespace-pre-wrap leading-relaxed text-center font-serif text-lg">
                      {content}
                    </div>
                    {genres.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-8 pt-6 border-t border-pink-900/20">
                        {genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-rose-900/30 to-pink-900/30 text-rose-300 border border-rose-800/30"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 italic">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-center font-serif text-lg">Your poem will appear here</p>
                    <p className="text-center text-sm mt-2 text-gray-600">Start writing to see the preview</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <p className="text-center font-serif">Preview is hidden</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="group inline-flex items-center px-8 py-4 border-2 border-transparent text-lg font-serif font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:via-pink-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
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
                Publishing Your Verse...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  ></path>
                </svg>
                Publish Your Poem
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SubmitPoem

