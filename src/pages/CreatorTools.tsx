import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Novel } from '../types/novel'
import type { Poem } from '../types/poem'
import {
  Share2,
  Image as ImageIcon,
  TrendingUp,
  BookOpen,
  Users,
  Zap,
  Sparkles,
  Award
} from 'lucide-react'
import { showSuccessToast } from '../utils/toast-utils'

interface Hook {
  text: string
  source: string
  score: number
}

const CreatorTools: React.FC = () => {
  const { currentUser, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [myNovels, setMyNovels] = useState<Novel[]>([])
  const [myPoems, setMyPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    const fetchMyNovels = async () => {
      try {
        let q
        if (isAdmin) {
          // Admins can see and scan all novels for marketing purposes
          q = query(collection(db, 'novels'))
        } else {
          // Regular authors see only their own
          q = query(collection(db, 'novels'), where('authorId', '==', currentUser.uid))
        }

        const querySnapshot = await getDocs(q)
        const novels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel))
        setMyNovels(novels)
      } catch (error) {
        console.error('Error fetching novels:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchMyPoems = async () => {
      try {
        let q
        if (isAdmin) {
          // Admins can see and scan all poems for marketing purposes
          q = query(collection(db, 'poems'))
        } else {
          // Regular authors see only their own
          q = query(collection(db, 'poems'), where('poetId', '==', currentUser.uid))
        }

        const querySnapshot = await getDocs(q)
        const poems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poem))
        setMyPoems(poems)
      } catch (error) {
        console.error('Error fetching poems:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMyNovels()
    fetchMyPoems()
  }, [currentUser, navigate, isAdmin])

  const [scanningNovelId, setScanningNovelId] = useState<string | null>(null)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [currentNovelTitle, setCurrentNovelTitle] = useState("")
  const [currentNovelAuthor, setCurrentNovelAuthor] = useState("")

  // For analytics, strictly only tally the user's actual owned novels even if they are an admin who can see all novels
  const personalNovels = currentUser ? myNovels.filter(n => n.authorId === currentUser.uid) : []
  const totalPlatformReads = personalNovels.reduce((sum, novel) => sum + (novel.views || 0), 0)

  const personalPoems = currentUser ? myPoems.filter(n => n.poetId === currentUser.uid) : []
  const totalPlatformPoemsReads = personalPoems.reduce((sum, poem) => sum + (poem.views || 0), 0)

  const findHooks = (novel: Novel) => {
    setScanningNovelId(novel.id)
    setHooks([])

    // Intensity triggers (words that make quotes feel profound)
    const powerWords = ["world", "life", "death", "film", "reality", "nothing", "everything", "never", "always", "inherited", "movies", "sunset", "picturesque", "mysterious", "heart", "shadow", "silence"]

    // Simulate a scan for effect
    setTimeout(() => {
      const allPossibleHooks: Hook[] = []

      novel.chapters.forEach((chapter) => {
        const blocks: string[] = []
        // Split by single newlines first
        const lines = chapter.content.split(/\n/).filter(p => p.trim().length > 0)

        lines.forEach(line => {
          if (line.length > 450) {
            // Break huge text walls into 2-4 sentence chunks
            const sentences = line.match(/[^.!?]+[.!?]+/g) || [line]
            let currentChunk = ""
            sentences.forEach(sent => {
              if (currentChunk.length + sent.length > 350) {
                if (currentChunk.trim().length > 0) blocks.push(currentChunk.trim())
                currentChunk = sent.trim()
              } else {
                currentChunk += (currentChunk ? " " : "") + sent.trim()
              }
            })
            if (currentChunk.trim().length > 0) blocks.push(currentChunk.trim())
          } else {
            blocks.push(line.trim())
          }
        })

        blocks.forEach((para, pIndex) => {
          const text = para.trim()
          let score = 0

          // CRITICAL: POSITION SCORING
          // Opening paragraphs of any chapter are almost always the "Hooks"
          if (pIndex < 3) score += 15

          // LENGTH SCORING (Favor 120-400 chars for good narrative blocks)
          if (text.length > 120 && text.length < 450) {
            score += 10
          } else if (text.length > 30 && text.length < 120) {
            score += 5
          } else {
            score -= 20 // Too short/too long are penalized
          }

          // CONTENT SCORING
          const lowerText = text.toLowerCase()

          // Comparative structures (like the user's example: "looked nothing like")
          if (lowerText.includes("nothing like") || lowerText.includes("nothing but") || lowerText.includes("instead of")) {
            score += 8
          }

          // Power word matches
          powerWords.forEach(word => {
            if (lowerText.includes(word)) score += 3
          })

          // Dialogue cleaning (Remove tags if they are external)
          if (text.startsWith('"') || text.startsWith('“')) {
            score += 5 // Dialogue is high engagement
          }

          if (score > 10) {
            allPossibleHooks.push({ text, source: chapter.title, score })
          }
        })
      })

      // Group by novel and pick top unique ones
      const sortedHooks = allPossibleHooks
        .sort((a, b) => b.score - a.score)
        .filter((v, i, a) => a.findIndex(t => t.text === v.text) === i) // Unique
        .slice(0, 6)

      setHooks(sortedHooks)
      setScanningNovelId(null)
      setCurrentNovelTitle(novel.title)
      setCurrentNovelAuthor(novel.authorName || "Author")
      showSuccessToast(`Discovered ${sortedHooks.length} high-impact hooks!`)
    }, 1800)
  }

  const handleCreateHookCard = (hook: Hook) => {
    navigate('/creator-studio/quote', {
      state: {
        quote: hook.text,
        novelTitle: currentNovelTitle,
        authorName: currentNovelAuthor
      }
    })
  }

  const handleCopyLink = (novelId: string) => {
    const link = `https://novlnest.com/novel/${novelId}`
    navigator.clipboard.writeText(link)
    showSuccessToast('Story link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-black border-b border-white/5 py-16 sm:py-24 px-6">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="h-3 w-3" /> Growth Accelerator
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">
            Creator Tools
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
            Free tools to help you share your stories, build your audience, and track your growth on NovlNest.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 sm:py-20">

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left Column: Tips & Stats */}
          <div className="space-y-8">

            {/* Achievement Preview */}
            <div className="relative group overflow-hidden bg-gradient-to-br from-[#1a1a1c] to-black border border-white/5 rounded-3xl p-8 text-center">
              <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${currentUser && (currentUser.followers?.length || 0) >= 50 ? 'text-yellow-500' : 'text-purple-500'}`}>
                <Award className="h-20 w-20" />
              </div>
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${currentUser && (currentUser.followers?.length || 0) >= 50 ? 'bg-yellow-500/20' : 'bg-purple-500/10'}`}>
                <Award className={`h-8 w-8 ${currentUser && (currentUser.followers?.length || 0) >= 50 ? 'text-yellow-400' : 'text-purple-500'}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">
                <span className="cursor-default select-none">Author Milestone</span>
              </h3>
              {currentUser && (currentUser.followers?.length || 0) >= 50 ? (
                <>
                  <p className="text-xs text-yellow-400/80 mb-6 font-medium">Congratulations! You've unlocked the "Rising Star" status.</p>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-yellow-400 h-full w-full" />
                  </div>
                  <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">{(currentUser.followers?.length || 0)} Followers (Goal Achieved)</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-6">Reach 50 followers to unlock the "Rising Star" verified badge.</p>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-purple-500 h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((((currentUser?.followers?.length || 0) / 50) * 100), 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser?.followers?.length || 0}/50 Followers</p>
                </>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-purple-400">
                <TrendingUp className="h-5 w-5" /> Growth Tips
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="mt-1 p-1 bg-yellow-500/20 rounded-md h-fit">
                    <Zap className="h-3 w-3 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Consistency is Key</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Update your novel at least once a week to stay trending on the homepage.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 p-1 bg-blue-500/20 rounded-md h-fit">
                    <Users className="h-3 w-3 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Engage in Comments</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Reply to your readers. Every reply counts as engagement and boosts visibility.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 p-1 bg-pink-500/20 rounded-md h-fit">
                    <ImageIcon className="h-3 w-3 text-pink-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Use Quote Cards</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Highlight your best lines in the reader and share them to your Instagram Stories.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Tools */}
          <div className="lg:col-span-2 space-y-12">

            {/* Tool Category: Analytics Dashboard */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Creator Analytics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Novel Views</p>
                  <p className="text-3xl font-black text-white">{totalPlatformReads.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Poem Views</p>
                  <p className="text-3xl font-black text-white">{totalPlatformPoemsReads.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Active Novels</p>
                  <p className="text-3xl font-black text-white">{personalNovels.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Active Poems</p>
                  <p className="text-3xl font-black text-white">{personalPoems.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Followers</p>
                  <p className="text-3xl font-black text-white">{currentUser?.followers?.length || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-gray-400 text-sm font-medium mb-1">Following</p>
                  <p className="text-3xl font-black text-white">{currentUser?.following?.length || 0}</p>
                </div>
              </div>

              {/* 7-Day Chart (Visual Distribution)
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="text-lg font-bold">Views (Last 7 Days)</h3>
                    <p className="text-sm text-gray-500">Based on your recent momentum</p>
                  </div>
                  <div className="text-green-400 text-sm font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md">
                    <TrendingUp className="h-4 w-4" /> Trending
                  </div>
                </div>

                <div className="h-48 flex items-end justify-between gap-2 md:gap-4 mt-8 pt-4 border-b border-white/5">
                  {[0.015, 0.021, 0.008, 0.035, 0.012, 0.018, 0.030].map((dist, i) => {
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    // Shift the distribution to make the current day the 7th block
                    const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0, Sun=6
                    const dayName = days[(todayIndex - 6 + i + 7) % 7];

                    const dailyValue = Math.floor(totalPlatformReads * dist);
                    const isToday = i === 6;

                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                        <div className="absolute -top-8 w-max flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <span className="text-xs text-white font-bold bg-gray-800 border border-gray-700 px-2 py-1 rounded shadow-xl">
                            {dailyValue > 0 ? dailyValue.toLocaleString() : '0'}
                          </span>
                        </div>
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-purple-500/20 group-hover:bg-purple-500/40'}`}
                          style={{ height: totalPlatformReads === 0 ? '5%' : `${Math.max(8, (dist / 0.035) * 100)}%` }}
                        ></div>
                        <div className={`mt-3 w-full text-center border-t border-transparent pt-2 ${isToday ? 'border-purple-500' : ''}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-white' : 'text-gray-500'}`}>
                            {dayName}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div> */}
            </section>

            {/* Tool Category: Social Sharing */}
            <section>
              <div className="flex items-center gap-3 mb-8 mt-12">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Share2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Social Share Kit</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myNovels.length > 0 ? myNovels.map(novel => (
                  <div key={novel.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {novel.coverImage ? (
                          <img src={novel.coverImage} className="w-10 h-14 object-cover rounded-md shadow-lg" alt="" />
                        ) : (
                          <div className="w-10 h-14 bg-gray-800 rounded-md flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-white line-clamp-1">{novel.title}</h3>
                          <p className="text-gray-500 text-xs">Novlnest Exclusive</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCopyLink(novel.id)}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                      >
                        Copy Link
                      </button>
                      <Link
                        to={`/novel/${novel.id}`}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold transition-all text-white"
                      >
                        Go to Page
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                    <p className="text-gray-500 mb-4">You haven't published any novels yet.</p>
                    <Link to="/submit" className="text-purple-400 font-bold hover:underline">Start writing now</Link>
                  </div>
                )}
              </div>
            </section>

            {/* Tool Category: Hook Discovery */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Hook Finder</h2>
                </div>
                {hooks.length > 0 && (
                  <button
                    onClick={() => setHooks([])}
                    className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                  >
                    Clear Results
                  </button>
                )}
              </div>

              {hooks.length === 0 ? (
                <div className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-white/5 rounded-3xl p-10 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Smart Hook Discovery</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Struggling to find the best line to share? Select a novel to scan for punchy dialogue and viral cliffhangers.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {myNovels.length > 0 ? (
                      myNovels.map(novel => (
                        <button
                          key={novel.id}
                          onClick={() => findHooks(novel)}
                          disabled={!!scanningNovelId}
                          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                        >
                          {scanningNovelId === novel.id ? (
                            <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-purple-400" />
                          )}
                          Scan "{novel.title}"
                        </button>
                      ))
                    ) : (
                      <div className="w-full mt-2">
                        <div className="text-sm text-gray-500 mb-6 bg-black/40 p-4 rounded-xl border border-white/5 inline-block max-w-sm">
                          You haven't published any novels yet. The scanner needs a story to work its magic!
                        </div>
                        <div>
                          <Link to="/submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 text-white shadow-lg shadow-purple-500/20">
                            <BookOpen className="h-4 w-4" /> Start Writing
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {hooks.map((hook, index) => (
                    <div key={index} className="group bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                      <div>
                        <div className="text-purple-400 opacity-20 text-4xl font-serif mb-[-10px]">&ldquo;</div>
                        <p className="text-sm font-medium italic text-gray-200 leading-relaxed mb-6 px-2">
                          {hook.text}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateHookCard(hook)}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="h-3 w-3" /> Create Quote Card
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-200">
                <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                  <ImageIcon className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-1 text-white">Manual Quote Card Creation</h4>
                  <p className="text-xs text-blue-200/80 leading-relaxed">
                    Don't want to use the scanner? You can also highlight any of your novel or poem's sentences directly inside the novel or poem reader page to instantly create a highly customizable quote card.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorTools
