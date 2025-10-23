import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Poem } from "../types/poem"
import SEOHead from "../components/SEOHead"

const PoemRead = () => {
  const { id } = useParams<{ id: string }>()
  const [poem, setPoem] = useState<Poem | null>(null)
  const [loading, setLoading] = useState(true)
  const [fontSize, setFontSize] = useState(18)

  useEffect(() => {
    const fetchPoem = async () => {
      if (!id) return

      try {
        const poemDoc = await getDoc(doc(db, "poems", id))
        if (poemDoc.exists()) {
          const poemData = { id: poemDoc.id, ...poemDoc.data() } as Poem
          setPoem(poemData)
        }
      } catch (error) {
        console.error("Error fetching poem:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoem()
  }, [id])

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 32))
  }

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 12))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#121212]">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!poem) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center bg-[#121212] min-h-screen">
        <h2 className="text-2xl font-bold text-white mb-4">Poem not found</h2>
        <Link to="/poems" className="text-purple-400 hover:text-purple-300">
          Browse all poems
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <SEOHead
        title={`Reading: ${poem.title} by ${poem.poetName} - NovlNest`}
        description={poem.description}
        keywords={`read poetry, poem, ${poem.genres.join(", ")}, ${poem.poetName}`}
        url={`https://novlnest.com/poem/${poem.id}/read`}
        canonicalUrl={`https://novlnest.com/poem/${poem.id}/read`}
      />

      {/* Header Controls */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to={`/poem/${poem.id}`}
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:inline">{poem.title}</span>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={decreaseFontSize}
                className="px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                aria-label="Decrease font size"
              >
                A-
              </button>
              <button
                onClick={increaseFontSize}
                className="px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Poem Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 rounded-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
            {poem.title}
          </h1>

          <div
            className="text-gray-200 whitespace-pre-wrap leading-relaxed text-center font-serif"
            style={{ fontSize: `${fontSize}px` }}
          >
            {poem.content}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PoemRead

