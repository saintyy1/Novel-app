"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import type { Novel } from "../types/novel"
import type { Poem } from "../types/poem"
import { BookOpen, BookOpenCheck, BookOpenText } from "lucide-react"
import SEOHead from "../components/SEOHead"
import CachedImage from "../components/CachedImage"

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
      return url
    }
  }

// Get poetry genre-based color gradients
const getPoemGenreColorClass = (genres: string[]) => {
  if (genres.includes("Romantic")) return "from-rose-500 to-pink-600"
  if (genres.includes("Nature")) return "from-emerald-500 to-teal-600"
  if (genres.includes("Free Verse")) return "from-purple-500 to-fuchsia-600"
  if (genres.includes("Haiku")) return "from-cyan-500 to-blue-600"
  if (genres.includes("Sonnet")) return "from-amber-500 to-orange-600"
  if (genres.includes("Epic")) return "from-red-600 to-rose-800"
  if (genres.includes("Lyric")) return "from-pink-400 to-rose-500"
  if (genres.includes("Narrative")) return "from-indigo-500 to-purple-600"
  if (genres.includes("Limerick")) return "from-yellow-400 to-amber-500"
  if (genres.includes("Ballad")) return "from-violet-500 to-purple-600"
  if (genres.includes("Elegy")) return "from-slate-600 to-gray-700"
  if (genres.includes("Ode")) return "from-orange-500 to-red-600"
  return "from-rose-600 to-pink-600" // Default poetry gradient
}

const LibraryPage = () => {
  const { currentUser, loading: authLoading } = useAuth()
  const [likedNovels, setLikedNovels] = useState<Novel[]>([])
  const [finishedNovels, setFinishedNovels] = useState<Novel[]>([])
  const [likedPoems, setLikedPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUserLibrary = async () => {
      if (authLoading || !currentUser) {
        setLoading(false)
        setLikedNovels([])
        setFinishedNovels([])
        setLikedPoems([])
        return
      }

      setLoading(true)
      setError("")
      try {
        const likedNovelIds = currentUser.library || []
        const finishedNovelIds = currentUser.finishedReads || []
        const likedPoemIds = currentUser.poemLibrary || []

        const allNovelIds = Array.from(new Set([...likedNovelIds, ...finishedNovelIds]))

        const novelPromises = allNovelIds.map((novelId) => getDoc(doc(db, "novels", novelId)))
        const poemPromises = likedPoemIds.map((poemId) => getDoc(doc(db, "poems", poemId)))
        
        const [novelDocs, poemDocs] = await Promise.all([
          Promise.all(novelPromises),
          Promise.all(poemPromises)
        ])

        const fetchedLikedNovels: Novel[] = []
        const fetchedFinishedNovels: Novel[] = []
        const fetchedLikedPoems: Poem[] = []

        novelDocs.forEach((novelDoc) => {
          if (novelDoc.exists()) {
            const novel = { id: novelDoc.id, ...novelDoc.data() } as Novel
            if (likedNovelIds.includes(novel.id)) {
              fetchedLikedNovels.push(novel)
            }
            if (finishedNovelIds.includes(novel.id)) {
              fetchedFinishedNovels.push(novel)
            }
          }
        })

        poemDocs.forEach((poemDoc) => {
          if (poemDoc.exists()) {
            const poem = { id: poemDoc.id, ...poemDoc.data() } as Poem
            fetchedLikedPoems.push(poem)
          }
        })

        setLikedNovels(fetchedLikedNovels)
        setFinishedNovels(fetchedFinishedNovels)
        setLikedPoems(fetchedLikedPoems)
      } catch (err) {
        console.error("Error fetching user library:", err)
        setError("Failed to load your library.")
      } finally {
        setLoading(false)
      }
    }
    fetchUserLibrary()
  }, [currentUser, authLoading])

  // Function to get genre-based color class for fallback covers
  const getGenreColorClass = (genres: string[]) => {
    if (genres.includes("Fantasy")) return "from-purple-500 to-indigo-600"
    if (genres.includes("Sci-Fi")) return "from-blue-500 to-cyan-600"
    if (genres.includes("Romance")) return "from-pink-500 to-rose-600"
    if (genres.includes("Mystery")) return "from-yellow-500 to-amber-600"
    if (genres.includes("Horror")) return "from-red-500 to-rose-800"
    if (genres.includes("Adventure")) return "from-green-500 to-emerald-600"
    if (genres.includes("Thriller")) return "from-orange-500 to-red-600"
    if (genres.includes("Historical Fiction")) return "from-amber-500 to-yellow-600"
    if (genres.includes("Comedy")) return "from-teal-500 to-green-600"
    if (genres.includes("Drama")) return "from-violet-500 to-purple-600"
    if (genres.includes("Dark Romance")) return "from-rose-700 to-purple-900"
    return "from-gray-600 to-gray-800" // Default
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your library</h2>
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

  interface BookCardProps {
    novel: Novel
    isFinished?: boolean
  }

  interface PoemCardProps {
    poem: Poem
  }

  const BookCard: React.FC<BookCardProps> = ({ novel, isFinished = false }) => {
    const [currentImageError, setCurrentImageError] = useState(false)

    useEffect(() => {
      // Reset image error when novel changes
      setCurrentImageError(false)
    }, [novel.id])

    const handleCardImageError = () => {
      setCurrentImageError(true)
    }

    const getImageSrc = () => {
      if (novel.coverSmallImage) {
        return getFirebaseDownloadUrl(novel.coverSmallImage)
      }
      if (novel.coverImage) {
        return getFirebaseDownloadUrl(novel.coverImage)
      }
      return "/placeholder.svg"
    }

    return (
      <Link
        to={`/novel/${novel.id}`}
        key={novel.id}
        className="group relative w-full aspect-[3/4] rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      >
        {/* Book Cover */}
        {(novel.coverSmallImage || novel.coverImage) && !currentImageError ? (
          <CachedImage
            uri={getImageSrc() || "/placeholder.svg"}
            alt={`Cover for ${novel.title}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleCardImageError}
            loading="lazy"
          />
        ) : (
          <div
            className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getGenreColorClass(
              novel.genres,
            )} overflow-hidden flex items-center justify-center`}
          >
            {/* Decorative background + title/author */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-2 w-4 h-4 border border-white rounded-full"></div>
              <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute bottom-3 left-3 w-3 h-3 border border-white"></div>
            </div>
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-yellow-600"></div>
            <div className="absolute right-0 top-0 w-px h-full bg-white opacity-20"></div>
            <div className="absolute right-1 top-0 w-px h-full bg-white opacity-15"></div>

            <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center">
              <h3 className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1">{novel.title}</h3>
              <div className="w-8 h-px bg-white opacity-50 mb-1"></div>
              <p className="text-white text-xs opacity-75 truncate w-full">{novel.authorName}</p>
            </div>
          </div>
        )}

        {/* Overlay for details and actions */}
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-white text-base font-bold line-clamp-2 mb-1">{novel.title}</h3>
          <p className="text-gray-300 text-xs line-clamp-1 mb-2">By {novel.authorName}</p>

          {/* Likes and Views */}
          <div className="flex items-center justify-between text-white text-xs mb-3">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              {novel.views || 0}
            </div>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              {novel.likes || 0}
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-md transition-colors flex items-center justify-center">
            {isFinished ? (
              <>
                <BookOpenText className="h-4 w-4 mr-2" /> Read Again
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" /> Continue Reading
              </>
            )}
          </button>
        </div>
      </Link>
    )
  }

  const PoemCard: React.FC<PoemCardProps> = ({ poem }) => {
    const [currentImageError, setCurrentImageError] = useState(false)

    useEffect(() => {
      setCurrentImageError(false)
    }, [poem.id])

    const handleCardImageError = () => {
      setCurrentImageError(true)
    }

    const getImageSrc = () => {
      if (poem.coverSmallImage) {
        return getFirebaseDownloadUrl(poem.coverSmallImage)
      }
      if (poem.coverImage) {
        return getFirebaseDownloadUrl(poem.coverImage)
      }
      return "/placeholder.svg"
    }

    return (
      <Link
        to={`/poem/${poem.id}`}
        key={poem.id}
        className="group relative w-full aspect-[3/4] rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      >
        {/* Poem Cover */}
        {(poem.coverSmallImage || poem.coverImage) && !currentImageError ? (
          <CachedImage
            uri={getImageSrc() || "/placeholder.svg"}
            alt={`Cover for ${poem.title}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleCardImageError}
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getPoemGenreColorClass(poem.genres || [])} overflow-hidden flex items-center justify-center`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-2 w-4 h-4 border border-white rounded-full"></div>
              <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute bottom-3 left-3 w-3 h-3 border border-white"></div>
            </div>
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-rose-300 to-pink-400"></div>
            <div className="absolute right-0 top-0 w-px h-full bg-white opacity-20"></div>
            <div className="absolute right-1 top-0 w-px h-full bg-white opacity-15"></div>

            <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center">
              <svg className="w-8 h-8 text-white/40 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <h3 className="text-white text-sm font-bold leading-tight line-clamp-2 mb-1 font-serif">{poem.title}</h3>
              <div className="w-8 h-px bg-white opacity-50 mb-1"></div>
              <p className="text-white text-xs opacity-75 truncate w-full font-serif italic">by {poem.poetName}</p>
            </div>
          </div>
        )}

        {/* Overlay for details and actions */}
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-white text-base font-bold line-clamp-2 mb-1 font-serif">{poem.title}</h3>
          <p className="text-gray-300 text-xs line-clamp-1 mb-2 font-serif italic">By {poem.poetName}</p>

          {/* Likes and Views */}
          <div className="flex items-center justify-between text-white text-xs mb-3">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              {poem.views || 0}
            </div>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              {poem.likes || 0}
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-sm font-semibold py-2 rounded-md transition-colors flex items-center justify-center">
            <BookOpen className="h-4 w-4 mr-2" /> Read Poem
          </button>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <SEOHead
        title="My Library - NovlNest"
        description="Access your personal library on NovlNest. View your liked novels, reading history, and manage your book collection in one place."
        keywords="library, my books, reading list, liked novels, book collection, personal library, NovlNest"
        url="https://novlnest.com/library"
        canonicalUrl="https://novlnest.com/library"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center">
          <BookOpen className="h-8 w-8 mr-3 text-purple-400" />
          Library
        </h1>
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {/* My Library Section (Liked/Currently Reading) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BookOpenText className="h-6 w-6 mr-2 text-purple-400" />
            Currently Reading
          </h2>
          {likedNovels.length === 0 ? (
            <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <h3 className="mt-2 text-xl font-medium text-white">Your reading list is empty</h3>
              <p className="mt-1 text-gray-400">Start liking novels to add them here!</p>
              <Link
                to="/novels"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                Browse Novels
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-center items-stretch">
              {likedNovels.map((novel) => (
                <BookCard key={novel.id} novel={novel} isFinished={false} />
              ))}
            </div>
          )}
        </section>

        {/* Finished Reads Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BookOpenCheck className="h-6 w-6 mr-2 text-green-400" />
            Finished Reads
          </h2>
          {finishedNovels.length === 0 ? (
            <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <BookOpenCheck className="mx-auto h-16 w-16 text-green-400 mb-4" />
              <h3 className="mt-2 text-xl font-medium text-white">No finished novels yet</h3>
              <p className="mt-1 text-gray-400">Mark novels as finished to see them here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-center items-stretch">
              {finishedNovels.map((novel) => (
                <BookCard key={novel.id} novel={novel} isFinished={true} />
              ))}
            </div>
          )}
        </section>

        {/* Poems Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <svg className="h-6 w-6 mr-2 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            Poetry Collection
          </h2>
          {likedPoems.length === 0 ? (
            <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <svg className="mx-auto h-16 w-16 text-rose-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <h3 className="mt-2 text-xl font-medium text-white">No poems in your collection yet</h3>
              <p className="mt-1 text-gray-400">Start liking poems to add them here!</p>
              <Link
                to="/poems"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
              >
                Browse Poems
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-center items-stretch">
              {likedPoems.map((poem) => (
                <PoemCard key={poem.id} poem={poem} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default LibraryPage
