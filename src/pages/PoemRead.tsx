import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { Sparkles, Award } from "lucide-react"
import { doc, getDoc, updateDoc, increment } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Poem } from "../types/poem"
import SEOHead from "../components/SEOHead"
import { withCache, CACHE_TTL, invalidatePoemCache } from "../utils/cache"
import { useAuth } from "../context/AuthContext"

const PoemRead = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [poem, setPoem] = useState<Poem | null>(null)
  const [loading, setLoading] = useState(true)
  const [fontSize, setFontSize] = useState(18)
  const [poetData, setPoetData] = useState<any>(null)
  const { currentUser, isAdmin } = useAuth()
  const poemContentRef = useRef<HTMLDivElement>(null)

  const [selectedQuote, setSelectedQuote] = useState("")
  const [showShareButton, setShowShareButton] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 })

  // Determine permission to copy/paste: allowed if admin or the poem's author
  const canCopyContent = !!(
    isAdmin || (currentUser && poem && currentUser.uid === poem.poetId)
  )

  const handleCreateCard = () => {
    if (!poem) return
    navigate('/creator-studio/quote', { 
      state: { 
        quote: selectedQuote,
        novelTitle: poem.title,
        authorName: poem.poetName || "Author"
      } 
    })
  }

  const handleTextSelection = useCallback(() => {
    if (!canCopyContent) return

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()

    if (selectedText && selectedText.length > 5) {
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()

      if (rect) {
        setButtonPosition({
          top: rect.top + window.scrollY - 50,
          left: rect.left + window.scrollX + rect.width / 2,
        })
        setSelectedQuote(selectedText)
        setShowShareButton(true)
      }
    } else {
      setShowShareButton(false)
    }
  }, [canCopyContent])

  useEffect(() => {
    document.addEventListener("selectionchange", handleTextSelection)
    return () => document.removeEventListener("selectionchange", handleTextSelection)
  }, [handleTextSelection])

  useEffect(() => {
    const fetchPoem = async () => {
      if (!id) return

      try {
        const poemData = await withCache(`poem_full_${id}`, async () => {
          const poemDoc = await getDoc(doc(db, "poems", id))
          if (poemDoc.exists()) {
            return { id: poemDoc.id, ...poemDoc.data() } as Poem
          }
          return null
        }, CACHE_TTL.CONTENT)
        
          if (poemData) {
            setPoem(poemData)

            if (poemData.poetId) {
              const poetDoc = await getDoc(doc(db, "users", poemData.poetId))
              if (poetDoc.exists()) setPoetData(poetDoc.data())
            }

            // Handle unique view count increment
            if (currentUser) {
              const poemDocRef = doc(db, "poems", id)
              const viewKey = `poem_view_${id}_${currentUser.uid}`
              const lastViewTimestamp = localStorage.getItem(viewKey)
              const now = Date.now()
              const twentyFourHours = 24 * 60 * 60 * 1000
              
              if (!lastViewTimestamp || now - Number(lastViewTimestamp) > twentyFourHours) {
                try {
                  await updateDoc(poemDocRef, {
                    views: increment(1),
                  })
                  localStorage.setItem(viewKey, now.toString())
                  // 🔥 Invalidate cache to show updated views
                  await invalidatePoemCache(id)
                } catch (updateError) {
                  console.error("Failed to update view count:", updateError)
                }
              }
            }
          }
      } catch (error) {
        console.error("Error fetching poem:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoem()
  }, [id])

  // Prevent copy/paste and selection within the reading area for unauthorized users
  useEffect(() => {
    const container = poemContentRef.current
    if (canCopyContent) return

    const prevent = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const keydownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "x" || key === "v" || key === "a")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Strengthen by listening on document as well
    document.addEventListener("copy", prevent, true)
    document.addEventListener("cut", prevent, true)
    document.addEventListener("paste", prevent, true)
    document.addEventListener("contextmenu", prevent, true)
    document.addEventListener("selectstart", prevent, true)
    document.addEventListener("dragstart", prevent, true)
    document.addEventListener("keydown", keydownHandler, true)

    // Also try scoping to container if present
    if (container) {
      container.addEventListener("copy", prevent)
      container.addEventListener("cut", prevent)
      container.addEventListener("paste", prevent)
      container.addEventListener("contextmenu", prevent)
      container.addEventListener("selectstart", prevent)
      container.addEventListener("dragstart", prevent)
      container.addEventListener("keydown", keydownHandler)
    }

    // Temporarily disable selection on body
    const previousUserSelect = document.body.style.userSelect
    const previousWebkitUserSelect = (document.body.style as any).webkitUserSelect
    document.body.style.userSelect = "none"
    ;(document.body.style as any).webkitUserSelect = "none"

    return () => {
      document.removeEventListener("copy", prevent, true)
      document.removeEventListener("cut", prevent, true)
      document.removeEventListener("paste", prevent, true)
      document.removeEventListener("contextmenu", prevent, true)
      document.removeEventListener("selectstart", prevent, true)
      document.removeEventListener("dragstart", prevent, true)
      document.removeEventListener("keydown", keydownHandler, true)

      if (container) {
        container.removeEventListener("copy", prevent)
        container.removeEventListener("cut", prevent)
        container.removeEventListener("paste", prevent)
        container.removeEventListener("contextmenu", prevent)
        container.removeEventListener("selectstart", prevent)
        container.removeEventListener("dragstart", prevent)
        container.removeEventListener("keydown", keydownHandler)
      }

      document.body.style.userSelect = previousUserSelect
      ;(document.body.style as any).webkitUserSelect = previousWebkitUserSelect
    }
  }, [poemContentRef, canCopyContent])

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
        <div className="bg-gray-800/50 rounded-xl p-8 md:p-12 relative">
          {/* Watermark */}
          <div className="absolute top-4 left-4 text-xs text-gray-400 italic flex items-center">
            Written by {poem.poetName}
            {(poetData?.followers?.length || 0) >= 100 && (
              <span title="Rising Star" className="ml-1 text-yellow-400 bg-yellow-400/10 p-0.5 rounded-full inline-flex">
                <Award className="h-3 w-3" />
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
            {poem.title}
          </h1>

          <div
            ref={poemContentRef}
            className={`text-gray-200 whitespace-pre-wrap leading-relaxed text-center font-serif ${canCopyContent ? "" : "select-none"}`}
            style={{ 
              fontSize: `${fontSize}px`,
              ...(canCopyContent ? {} : { userSelect: "none", WebkitUserSelect: "none" as any })
            }}
            draggable={false}
            tabIndex={canCopyContent ? -1 : 0}
            onCopy={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onCut={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onPaste={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onContextMenu={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onMouseDown={(e) => {
              if (!canCopyContent) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {poem.content}
          </div>
        </div>
      </div>

      {/* Floating Share Quote Button */}
      {showShareButton && (
        <button
          onClick={handleCreateCard}
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translateX(-50%)'
          }}
          className="fixed z-[100] flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg transition-all animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold">Create Quote Card</span>
        </button>
      )}
    </div>
  )
}

export default PoemRead

