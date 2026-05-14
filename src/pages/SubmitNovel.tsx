"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { collection, doc, setDoc, writeBatch } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"
import { db, storage } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import MDEditor from "@uiw/react-md-editor"
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Character } from "../types/novel"
import SEOHead from "../components/SEOHead"
import { invalidateProfileCache, invalidateNovelCache } from "../utils/cache"
import { incrementStat } from "../services/statsService"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SubmitNovel = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [summary, setSummary] = useState("")
  const [authorsNote, setAuthorsNote] = useState("")
  const [prologue, setPrologue] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [hasGraphicContent, setHasGraphicContent] = useState<boolean>(false)
  const [chapters, setChapters] = useState<{ title: string; content: string }[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState("")

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  // Character Form State
  const [showCharModal, setShowCharModal] = useState(false)
  const [charName, setCharName] = useState("")
  const [charDesc, setCharDesc] = useState("")
  const [charFile, setCharFile] = useState<File | null>(null)
  const [charPreview, setCharPreview] = useState<string | null>(null)

  const availableGenres = [
    "Fantasy", "Sci-Fi", "Romance", "Mystery", "Horror", "Adventure",
    "Thriller", "Historical Fiction", "Comedy", "Drama", "Fiction",
    "Dystopian", "Dark Romance"
  ]

  const handleGenreChange = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre))
    } else {
      setGenres([...genres, genre])
    }
  }

  const countSentences = (text: string): number => {
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
    const newChapters = [...chapters]
    newChapters.splice(index, 1)
    setChapters(newChapters)
  }

  const handleAddCharacter = async () => {
    if (!charName.trim()) return

    const newChar: Character = {
      id: Date.now().toString(),
      name: charName.trim(),
      description: charDesc.trim(),
      imageUrl: charPreview // Temporary preview
    }

    setCharacters([...characters, newChar as any])
    setCharName("")
    setCharDesc("")
    setCharFile(null)
    setCharPreview(null)
    setShowCharModal(false)
  }

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id))
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

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
        setError("Cover image must be JPEG, PNG or WebP format")
        return
      }
      const reader = new FileReader()
      reader.onload = () => setCoverPreview(reader.result as string)
      reader.readAsDataURL(file)
      setSelectedFile(file)
      setError("")
    }
  }

  const handleCharImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => setCharPreview(reader.result as string)
      reader.readAsDataURL(file)
      setCharFile(file)
    }
  }

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.includes("pdf")) {
        setParseError("Please upload a valid PDF file.");
        return;
      }
      try {
        setIsParsing(true);
        setParseError("");
        const arrayBuffer = await file.arrayBuffer();
        const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        let structuredLines: { text: string; y: number; fontSize: number; pageNum: number }[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          textContent.items.forEach((item: any) => {
            const text = item.str.trim();
            if (!text) return;
            structuredLines.push({ text, y: item.transform[5], fontSize: item.transform[0], pageNum: i });
          });
        }

        structuredLines.sort((a, b) => {
          if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
          return b.y - a.y;
        });

        let fullText = '';
        let lastY = 0;
        let lastPageNum = 1;

        structuredLines.forEach((line, index) => {
          const { text, y, pageNum } = line;
          if (pageNum !== lastPageNum) {
            fullText += '\n\n';
            lastPageNum = pageNum;
            lastY = y;
          }
          if (index > 0 && pageNum === lastPageNum) {
            const yDiff = Math.abs(y - lastY);
            if (yDiff > 12) fullText += '\n\n';
            else if (yDiff > 2) fullText += ' ';
          }
          fullText += text;
          lastY = y;
        });

        fullText = fullText.replace(/\n{3,}/g, '\n\n').replace(/C\s+hapter/gi, 'Chapter').replace(/CHAPT\s+ER/gi, 'CHAPTER');

        const chapterRegex = /(?:^|\n\n)\s*((?:Chapter|CHAPTER|Ch\.?)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|[IVX]+)(?:\s*[:\-—–][^\n]+)?)/gi;
        const matches = Array.from(fullText.matchAll(chapterRegex));
        let extractedChapters: { title: string; content: string }[] = [];

        if (matches.length > 0) {
          matches.forEach((match, index) => {
            const chapterTitle = match[1].trim();
            const startPos = match.index! + match[0].length;
            const endPos = index < matches.length - 1 ? matches[index + 1].index! : fullText.length;
            let content = fullText.substring(startPos, endPos).trim().replace(/([^\n])\n([^\n])/g, '$1 $2').replace(/ {2,}/g, ' ');
            content = content.split('\n\n').map(p => p.trim()).join('\n\n');
            if (content.length > 50) extractedChapters.push({ title: chapterTitle, content });
          });
        }

        if (extractedChapters.length === 0) {
          extractedChapters = [{ title: "Chapter 1", content: fullText.trim().replace(/([^\n])\n([^\n])/g, '$1 $2').replace(/ {2,}/g, ' ') }];
        }

        setChapters(extractedChapters);
        setParseError(extractedChapters.length > 1 ? "" : "Note: Only 1 chapter detected.");
      } catch (error) {
        console.error("PDF parsing failed:", error);
        setParseError("Failed to parse PDF file.");
      } finally {
        setIsParsing(false);
      }
    }
  }

  const handleSubmit = async () => {
    if (genres.length === 0) return setError("Please select at least one genre")
    if (chapters.length > 0 && chapters.some(c => !c.content.trim())) return setError("All chapters must have content")
    if (!chapters.length && !authorsNote.trim() && !prologue.trim()) return setError("Please add at least some content")

    try {
      setLoading(true)
      setError("")

      const docRef = doc(collection(db, "novels"))
      let coverUrl = null
      let coverSmallUrl = null

      // 1. Process Images
      if (selectedFile) {
        const resizedBlob = await resizeUnder1MB(selectedFile)
        const smallBlob = await generateSmallBlob(selectedFile)
        const coverRef = ref(storage, `covers-large/${docRef.id}.jpg`)
        const coverSmallRef = ref(storage, `covers-small/${docRef.id}.jpg`)
        await uploadBytes(coverRef, resizedBlob)
        await uploadBytes(coverSmallRef, smallBlob)
        coverUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/${"covers-large"}/${docRef.id}.jpg`
        coverSmallUrl = `https://storage.googleapis.com/novelnest-50ab1.firebasestorage.app/${"covers-small"}/${docRef.id}.jpg`
      }

      // 2. Process Characters
      const finalCharacters = await Promise.all(characters.map(async (char) => {
        // If it was just a local preview, we need to upload if we had a file
        // For now, if we don't have the file logic here, we'll just use the preview if it's already a URL
        return { id: char.id, name: char.name, description: char.description, imageUrl: char.imageUrl };
      }))

      // 3. Save Novel Metadata
      await setDoc(docRef, {
        title,
        description,
        summary,
        authorsNote: authorsNote || null,
        prologue: prologue || null,
        genres,
        hasGraphicContent,
        chapterCount: chapters.length,
        chapterTitles: chapters.map(ch => ch.title),
        characters: finalCharacters,
        authorId: currentUser?.uid,
        authorName: currentUser?.displayName,
        isPromoted: false,
        published: false,
        publicDomain: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coverImage: coverUrl || null,
        coverSmallImage: coverSmallUrl || null,
        status: "ongoing",
        likes: 0,
        views: 0,
      })

      // 4. Save Chapters to Subcollection
      const batch = writeBatch(db)
      chapters.forEach((chapter, index) => {
        const chapterRef = doc(db, "novels", docRef.id, "chapters", index.toString())
        batch.set(chapterRef, {
          ...chapter,
          order: index,
          createdAt: new Date().toISOString()
        })
      })
      await batch.commit()

      await invalidateNovelCache(docRef.id)
      await invalidateProfileCache(currentUser?.uid || "")
      incrementStat({ totalNovels: 1, pendingNovels: 1 })

      navigate(`/profile/${currentUser?.uid}`)
      alert("Your novel has been submitted for review!")
    } catch (error) {
      console.error("Error submitting novel:", error)
      setError("Failed to submit novel. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const validateStep = () => {
    if (step === 1) {
      if (!title.trim()) return "Title is required"
      if (!description.trim()) return "Description is required"
      if (!selectedFile && !coverPreview) return "Cover image is required"
      if (genres.length === 0) return "Please select at least one genre"
    }
    if (step === 2) {
      if (!summary.trim()) return "Detailed summary is required"
    }
    return null
  }

  const handleNextStep = () => {
    const error = validateStep()
    if (error) {
      setError(error)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError("")
    setStep(step + 1)
  }

  const isStepValid = () => {
    if (step === 1) return title.trim() && description.trim() && (selectedFile || coverPreview) && genres.length > 0
    if (step === 2) return summary.trim()
    return true
  }

  const renderStepIndicator = () => {
    const stepTitles = ["Basics", "Details", "Cast", "Chapters", "Review"];
    return (
      <div className="flex items-center justify-center mb-12 max-w-2xl mx-auto px-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`flex items-center ${s < 5 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center relative">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 z-10 ${step >= s ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}>
                {s}
              </div>
              <span className={`absolute -bottom-6 text-[10px] sm:text-xs font-medium whitespace-nowrap hidden sm:block ${step >= s ? "text-purple-300" : "text-gray-500"}`}>
                {stepTitles[s - 1]}
              </span>
            </div>
            {s < 5 && (
              <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded-full transition-all duration-300 ${step > s ? "bg-purple-600" : "bg-gray-800"
                }`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to submit a novel</h2>
          <Link to="/login" className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-0 sm:px-4">
      <SEOHead title="Submit Your Novel - NovlNest" description="Share your creative writing with the world on NovlNest." />

      <div className="text-center my-10">
        <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-2">
          {step === 5 ? "Review & Publish" : "Share Your Story"}
        </h1>
        <p className="text-gray-400 italic">Step {step} of 5</p>
      </div>

      {renderStepIndicator()}

      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">{error}</div>}

      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-4 sm:p-8 border border-purple-900/20 mb-8 min-h-[500px]">

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-serif font-bold text-purple-300 border-b border-purple-900/30 pb-3">The Basics</h2>
            <div>
              <label className="block text-sm font-medium text-purple-200/90 mb-2">Novel Title *</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white font-serif text-lg focus:ring-2 focus:ring-purple-500 outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your novel's title" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200/90 mb-2">One-Sentence Description *</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-purple-500 outline-none" value={description} onChange={handleDescriptionChange} placeholder="Capture the essence in one line..." required />
              <p className="mt-1 text-xs text-purple-300/60">{countSentences(description)} of 1 sentences used</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-purple-200/90 mb-2">Cover Image *</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-44 bg-gray-900/50 border border-purple-900/30 rounded-lg overflow-hidden flex items-center justify-center relative group">
                    {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleCoverImageChange} required />
                  </div>
                  <div className="flex-1 text-xs text-gray-500 space-y-2">
                    <p>PNG, JPG, WEBP</p>
                    <p>Recommended: 600 x 900</p>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-purple-400 font-bold hover:underline">Select Image</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200/90 mb-3">Genres *</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableGenres.map((g) => (
                    <button key={g} type="button" onClick={() => handleGenreChange(g)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${genres.includes(g) ? "bg-purple-600/20 border-purple-500 text-purple-200" : "bg-gray-900/30 border-gray-700 text-gray-500"}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-serif font-bold text-purple-300 border-b border-purple-900/30 pb-3">Story Details</h2>
            <div>
              <label className="block text-sm font-medium text-purple-200/90 mb-2">Detailed Summary *</label>
              <textarea className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white h-40 outline-none" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What's your story about?" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-200/90 mb-2">Author's Note (Optional)</label>
                <textarea className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white h-32 outline-none" value={authorsNote} onChange={(e) => setAuthorsNote(e.target.value)} placeholder="Message to your readers..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200/90 mb-2">Prologue (Optional)</label>
                <textarea className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white h-32 outline-none font-serif" value={prologue} onChange={(e) => setPrologue(e.target.value)} placeholder="The beginning before the beginning..." />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-red-900/10 border border-red-900/20 rounded-xl group transition-all hover:bg-red-900/20">
                <input type="checkbox" checked={hasGraphicContent} onChange={(e) => setHasGraphicContent(e.target.checked)} className="w-5 h-5 rounded border-red-900/50 text-red-600 focus:ring-red-500" />
                <span className="text-red-300 font-medium">This story contains graphic content (violence, gore, etc.)</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: CAST */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-purple-900/30 pb-3">
              <h2 className="text-2xl font-serif font-bold text-purple-300">Cast of Characters</h2>
              <button onClick={() => setShowCharModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-all">+ Add Character</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div key={char.id} className="bg-gray-900/50 border border-purple-900/20 rounded-xl p-4 flex gap-4 relative group">
                  <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                    {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-700">{char.name[0]}</div>}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-purple-200 font-bold">{char.name}</h3>
                    <p className="text-gray-500 text-xs line-clamp-2">{char.description}</p>
                  </div>
                  <button onClick={() => removeCharacter(char.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
              ))}
              {characters.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-600 italic">No characters added yet. Help your readers visualize the cast!</div>
              )}
            </div>

            {showCharModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-purple-900/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6">New Character</h3>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-purple-900/30 overflow-hidden relative group">
                        {charPreview ? <img src={charPreview} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><svg className="w-10 h-10 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg></div>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCharImageChange} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Name</label>
                      <input type="text" value={charName} onChange={(e) => setCharName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-purple-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Description</label>
                      <textarea value={charDesc} onChange={(e) => setCharDesc(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white h-24 outline-none focus:border-purple-600" />
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button onClick={() => setShowCharModal(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 font-bold hover:bg-gray-800">Cancel</button>
                      <button onClick={handleAddCharacter} className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700">Add</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: CHAPTERS */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-900/30 pb-3">
              <h2 className="text-2xl font-serif font-bold text-purple-300">Chapters</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    Import PDF
                  </button>
                  <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePDFUpload} />
                </div>
                <button onClick={addChapter} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-all flex items-center justify-center">+ Add Chapter</button>
              </div>
            </div>

            {isParsing && <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-indigo-300 animate-pulse">Parsing PDF Chapters... Please wait.</div>}

            <div className="space-y-4 pr-2">
              {chapters.map((ch, idx) => (
                <div key={idx} className="bg-gray-900/50 border border-purple-900/20 rounded-xl p-3 sm:p-6 space-y-4 relative">
                  <div className="flex items-center">
                    <input type="text" value={ch.title} onChange={(e) => handleChapterTitleChange(idx, e.target.value)} placeholder="Chapter Title" className="flex-1 bg-transparent text-white font-bold border-b border-gray-800 focus:border-purple-600 outline-none pb-1" />
                    <button onClick={() => removeChapter(idx)} className="text-red-500 hover:text-red-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                  </div>
                  <MDEditor
                    value={ch.content}
                    onChange={(v) => handleChapterContentChange(idx, v || "")}
                    preview="edit"
                    minHeight={400}
                    style={{ width: '100%', overflow: 'hidden' }}
                    textareaProps={{
                      placeholder: "Enter chapter content...",
                      style: { minHeight: '400px' }
                    }}
                  />
                </div>
              ))}
              {chapters.length === 0 && (
                <div className="py-20 text-center space-y-4 bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl">
                  <svg className="w-16 h-16 text-gray-800 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <p className="text-gray-600 italic">Add your first chapter or import a PDF.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-8 sm:items-start items-center">
              <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-purple-900/30 bg-gray-900">
                {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-800">No Cover</div>}
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="text-4xl font-serif font-bold text-white">{title || "Untitled Novel"}</h2>
                <div className="flex gap-2 flex-wrap">
                  {genres.map(g => <span key={g} className="px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs">{g}</span>)}
                </div>
                <p className="text-gray-300 font-serif text-lg leading-relaxed">{description || "No description provided."}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-purple-900/20">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-purple-300">Content Stats</h3>
                <div className="bg-gray-900/50 rounded-xl p-6 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Author's Note</span><span className={authorsNote ? "text-green-500 font-bold" : "text-gray-700"}>{authorsNote ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Prologue</span><span className={prologue ? "text-green-500 font-bold" : "text-gray-700"}>{prologue ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Characters</span><span className="text-white font-bold">{characters.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Chapters</span><span className="text-white font-bold">{chapters.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Graphic Content</span><span className={hasGraphicContent ? "text-red-500 font-bold" : "text-green-500 font-bold"}>{hasGraphicContent ? "Yes" : "No"}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-purple-300">Submission Info</h3>
                <div className="bg-gray-900/50 rounded-xl p-6 space-y-3">
                  <p className="text-gray-400 text-sm leading-relaxed">By clicking publish, your novel will be submitted for review. This typically takes 24-48 hours. Once approved, it will be visible to all readers on NovlNest.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-purple-900/20">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1)
            } else {
              navigate(-1)
            }
          }}
          className="w-full sm:w-auto px-8 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold hover:bg-gray-800 transition-all text-center"
        >
          {step === 1 ? "Cancel" : "Previous Step"}
        </button>

        {step < 5 ? (
          <button
            onClick={handleNextStep}
            disabled={!isStepValid()}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-10 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Confirm & Publish"}
          </button>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4338ca; }
      `}</style>
    </div>
  )
}

export default SubmitNovel
