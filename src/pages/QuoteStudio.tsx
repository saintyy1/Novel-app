import React, { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Download,
  Copy,
  Check,
  Palette,
  Type,
  Maximize,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { showSuccessToast, showErrorToast } from '../utils/toast-utils'

interface QuoteStudioState {
  quote: string
  authorName: string
  novelTitle: string
}

const QuoteStudio: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as QuoteStudioState

  const [quote, setQuote] = useState(state?.quote || "")
  const [authorName] = useState(state?.authorName || "Author")
  const [novelTitle] = useState(state?.novelTitle || "Story Title")

  const cardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(0)
  const [copied, setCopied] = useState(false)
  const [fontSizeScale, setFontSizeScale] = useState(1)

  useEffect(() => {
    if (!state) {
      navigate('/creator-tools')
    }
  }, [state, navigate])

  const themes = [
    {
      name: 'Midnight Purple',
      bg: 'bg-gradient-to-br from-purple-900 via-indigo-950 to-black',
      text: 'text-white',
      accent: 'text-purple-400',
      border: 'border-purple-500/30'
    },
    {
      name: 'Sunset Glow',
      bg: 'bg-gradient-to-br from-orange-600 via-pink-700 to-purple-900',
      text: 'text-white',
      accent: 'text-yellow-300',
      border: 'border-white/20'
    },
    {
      name: 'Emerald Night',
      bg: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-black',
      text: 'text-white',
      accent: 'text-emerald-400',
      border: 'border-emerald-500/30'
    },
    {
      name: 'Ethereal White',
      bg: 'bg-gradient-to-br from-slate-50 to-slate-200',
      text: 'text-slate-900',
      accent: 'text-purple-600',
      border: 'border-slate-300'
    },
    {
      name: 'Royal Velvet',
      bg: 'bg-gradient-to-br from-rose-900 via-crimson-950 to-black',
      text: 'text-white',
      accent: 'text-rose-400',
      border: 'border-rose-500/30'
    }
  ]

  const handleExport = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    try {
      // Small delay to ensure any layout shifts are settled
      await new Promise(resolve => setTimeout(resolve, 100))

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 4 // Ultra high resolution
      })

      const link = document.createElement('a')
      link.download = `Novlnest-Studio-${novelTitle.replace(/\s+/g, '-')}.png`
      link.href = dataUrl
      link.click()
      showSuccessToast('High-res quote card exported!')
    } catch (err) {
      console.error('Failed to export image', err)
      showErrorToast('Failed to generate high-res image')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/novel/${novelTitle.toLowerCase().replace(/\s+/g, '-')}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showSuccessToast('Story link copied!')
  }

  const getFontSizeClass = (text: string) => {
    const len = text.length
    if (len < 100) return 'text-3xl md:text-5xl'
    if (len < 200) return 'text-2xl md:text-3xl'
    if (len < 400) return 'text-xl md:text-2xl'
    return 'text-lg md:text-xl'
  }

  const getDynamicLeading = (text: string) => {
    return text.length > 200 ? 'leading-relaxed' : 'leading-loose'
  }

  if (!state) return null

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      {/* Studio Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Creator Studio</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Quote Designer • Beta</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-900/20"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row">
        {/* Left: Preview Workspace */}
        <div className="flex-1 bg-black/40 p-6 md:p-12 flex items-start justify-center overflow-y-auto">
          <div className="sticky top-6 w-full max-w-sm flex flex-col items-center">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Maximize className="h-3 w-3" /> Preview (9:16 Story Format)
            </p>

            <div
              ref={cardRef}
              className={`${themes[selectedTheme].bg} w-full aspect-[9/16] rounded-[2.5rem] p-12 flex flex-col justify-between relative shadow-2xl overflow-hidden border ${themes[selectedTheme].border}`}
            >
              {/* Artistic Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -ml-32 -mb-32" />

              <div className="flex justify-between items-start relative z-10">
                <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/10">
                  <img src="/images/logo.png" alt="NovlNest" className="h-6 w-6 object-contain" />
                </div>
                <div className={`text-[10px] font-black uppercase tracking-[0.4em] opacity-40 ${themes[selectedTheme].text}`}>
                  NovlNest
                </div>
              </div>

              <div className="flex-grow flex items-center justify-center py-10 relative z-10">
                <div className="relative w-full">
                  <span className={`absolute -top-12 -left-8 text-9xl opacity-10 font-serif ${themes[selectedTheme].text}`}>&ldquo;</span>
                  <p
                    className={`font-serif italic tracking-tight text-center relative z-10 px-4 ${themes[selectedTheme].text} ${getFontSizeClass(quote)} ${getDynamicLeading(quote)}`}
                    style={{ fontSize: `calc(100% * ${fontSizeScale})` }}
                  >
                    {quote}
                  </p>
                  <span className={`absolute -bottom-16 -right-8 text-9xl opacity-10 font-serif ${themes[selectedTheme].text}`}>&rdquo;</span>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 flex flex-col items-center relative z-10">
                <p className={`text-base font-black tracking-tight mb-2 ${themes[selectedTheme].text}`}>
                  {novelTitle}
                </p>
                <div className={`flex items-center gap-2 text-[11px] font-medium opacity-70 ${themes[selectedTheme].text}`}>
                  <span className="opacity-50">by</span> {authorName}
                </div>
                <div className={`mt-8 text-[9px] font-black tracking-[0.4em] uppercase opacity-30 ${themes[selectedTheme].text}`}>
                  Exclusive on NovlNest.com
                </div>
              </div>
            </div>

            <p className="mt-8 text-[11px] text-gray-500 italic max-w-xs text-center leading-relaxed">
              Tip: This export is optimized for high-resolution Instagram & TikTok story backgrounds.
            </p>
          </div>
        </div>

        {/* Right: Studio Controls */}
        <div className="w-full lg:w-[450px] bg-[#0a0a0b] border-t lg:border-t-0 lg:border-l border-white/5 p-8 sm:p-12 overflow-y-auto">
          <div className="space-y-12 max-w-sm mx-auto">

            {/* Control: Content Editor */}
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Type className="h-3 w-3" /> Edit Content
              </p>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all outline-none resize-none font-serif italic"
                placeholder="Paste or polish your quote here..."
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{quote.length} Characters</p>
                {quote.length > 500 && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Lengthy Quote</p>}
              </div>
            </div>

            {/* Control: Style Palette */}
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Palette className="h-3 w-3" /> Theme Palette
              </p>
              <div className="grid grid-cols-5 gap-4">
                {themes.map((theme, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTheme(index)}
                    className={`group relative h-12 w-12 rounded-2xl transition-all ${selectedTheme === index ? 'ring-2 ring-purple-600 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'} ${theme.bg}`}
                  >
                    {selectedTheme === index && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Control: Font Control */}
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Type className="h-3 w-3" /> Visual Scale
              </p>
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {[
                  { label: 'Minor', scale: 0.85 },
                  { label: 'Normal', scale: 1 },
                  { label: 'Major', scale: 1.15 }
                ].map((size) => (
                  <button
                    key={size.label}
                    onClick={() => setFontSizeScale(size.scale)}
                    className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${fontSizeScale === size.scale ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {size.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Control: Call to action */}
            <div className="pt-8 space-y-4">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold transition-all text-sm"
              >
                {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-gray-400" />}
                Copy Story Link
              </button>

              <div className="flex items-center gap-2 px-4 py-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <p className="text-[10px] text-purple-300/80 leading-relaxed font-medium">
                  We've optimized this image with 4x Pixel Density for high-quality social media rendering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default QuoteStudio
