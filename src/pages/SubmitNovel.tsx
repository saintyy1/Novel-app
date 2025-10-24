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
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import InlineChatEditor from "../components/InlineChatEditor"
import type { ChatMessage } from "../types/novel"
import SEOHead from "../components/SEOHead"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SubmitNovel = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [summary, setSummary] = useState("")
  const [authorsNote, setAuthorsNote] = useState("")
  const [prologue, setPrologue] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [hasGraphicContent, setHasGraphicContent] = useState<boolean>(false)
  const [chapters, setChapters] = useState<{ title: string; content: string; chatMessages?: ChatMessage[] }[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPreview, setShowPreview] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState("")

  const availableGenres = [
    "Fantasy",
    "Sci-Fi",
    "Romance",
    "Mystery",
    "Horror",
    "Adventure",
    "Thriller",
    "Historical Fiction",
    "Comedy",
    "Drama",
    "Fiction",
    "Dystopian",
    "Dark Romance",
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

  const insertChatIntoChapter = (index: number, messages: ChatMessage[]) => {
    const newChapters = [...chapters]
    const currentContent = newChapters[index].content

    // Create simple JSON marker for chat messages
    const chatData = `[CHAT_START]${JSON.stringify(messages)}[CHAT_END]`

    // Insert at cursor position or at the end
    newChapters[index].content = currentContent + '\n\n' + chatData + '\n\n'
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

        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Extract text from each page with better formatting
        const numPages = pdf.numPages;
        let fullText = '';
        let structuredLines: { text: string; y: number; fontSize: number; pageNum: number }[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Collect all items with their positions and font sizes
          textContent.items.forEach((item: any) => {
            const text = item.str.trim();
            if (!text) return;
            
            const y = item.transform[5];
            const fontSize = item.transform[0]; // Font size/scale
            
            structuredLines.push({
              text,
              y,
              fontSize,
              pageNum: i
            });
          });
        }

        // Sort by page number and Y position (descending Y means top to bottom)
        structuredLines.sort((a, b) => {
          if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
          return b.y - a.y;
        });

        // Build text with better paragraph detection and chapter identification
        let currentPageText = '';
        let lastY = 0;
        let lastPageNum = 1;

        structuredLines.forEach((line, index) => {
          const { text, y, pageNum } = line;
          
          // Page break detection
          if (pageNum !== lastPageNum) {
            currentPageText += '\n\n';
            lastPageNum = pageNum;
            lastY = y;
          }
          
          // Detect paragraph breaks based on Y position
          if (index > 0 && pageNum === lastPageNum) {
            const yDiff = Math.abs(y - lastY);
            
            // Get the last few characters to check for word boundaries
            const lastChars = currentPageText.slice(-10).trim();
            const endsWithPartialWord = lastChars.length > 0 && 
              !/[\s\.\,\!\?\:\;\-\n]$/.test(lastChars);
            
            // Check if current text starts with lowercase (likely continuation)
            const startsWithLowercase = /^[a-z]/.test(text);
            
            // Check if the previous text ended with sentence-ending punctuation
            const endsWithSentence = /[.!?]["']?\s*$/.test(currentPageText.trimEnd());
            
            // Adjusted thresholds for better paragraph detection
            // Large Y difference + sentence ended = paragraph break
            // This ensures multiple sentences stay together unless there's a real gap
            if (yDiff > 12 && endsWithSentence) {
              currentPageText += '\n\n';
            } 
            // Medium Y difference = just a space (keep sentences together in paragraph)
            else if (yDiff > 2) {
              if (currentPageText && !currentPageText.endsWith(' ') && !currentPageText.endsWith('\n')) {
                currentPageText += ' ';
              }
            } 
            // Very small Y difference = same line, add space or join word
            else if (yDiff <= 2) {
              // Don't add space if the last text ends with partial word and this starts lowercase
              // This handles cases like "C" + "hapter" becoming "Chapter" not "C hapter"
              if (!(endsWithPartialWord && startsWithLowercase)) {
                if (currentPageText && !currentPageText.endsWith(' ') && !currentPageText.endsWith('\n')) {
                  currentPageText += ' ';
                }
              }
            }
          }
          
          currentPageText += text;
          lastY = y;
        });

        fullText = currentPageText;

        // First normalize excessive newlines but KEEP single/double newlines for chapter detection
        fullText = fullText.replace(/\n{3,}/g, '\n\n');
        
        // Check for broken chapter patterns
        const brokenChapterCheck = fullText.match(/C\s+hapter|CHAPT\s+ER/gi);
        if (brokenChapterCheck) {
          console.warn('Found broken chapter patterns:', brokenChapterCheck);
        }

        // Enhanced chapter detection with multiple strategies
        let chapters: { title: string; content: string }[] = [];
        
        // Strategy 1: Look for explicit chapter markers in the text
        // First, try to fix any broken "C hapter" patterns
        fullText = fullText.replace(/C\s+hapter/gi, 'Chapter');
        fullText = fullText.replace(/CHAPT\s+ER/gi, 'CHAPTER');
        
        // More flexible regex that handles various spacing and formats
        // Match chapter headers - we'll clean up subtitle extraction in post-processing
        const chapterRegex = /(?:^|\n\n)\s*((?:Chapter|CHAPTER|Ch\.?)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|[IVX]+)(?:\s*[:\-—–][^\n]+)?)/gi;
        
        const matches = Array.from(fullText.matchAll(chapterRegex));
        
        if (matches.length > 0) {
          matches.forEach((match, index) => {
            const fullChapterTitle = match[1].trim();
            
            // Extract clean subtitle first (e.g., "Chapter One - The Beginning" -> "The Beginning")
            let chapterTitle = fullChapterTitle;
            let cleanChapterHeader = fullChapterTitle; // The actual chapter header without sentence content
            
            // Match everything after the separator
            const subtitleMatch = fullChapterTitle.match(/^((?:Chapter|CHAPTER|Ch\.?)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|[IVX]+)\s*[:\-—–])\s*(.+)$/i);
            
            if (subtitleMatch && subtitleMatch[2]) {
              const chapterPrefix = subtitleMatch[1]; // "Chapter Two –"
              let subtitle = subtitleMatch[2].trim();
              
              // Clean up: Remove any sentence content that might be attached
              // Look for pattern: "Subtitle SentenceStart" where SentenceStart is Capital followed by lowercase word
              // This detects when a sentence starts: "Reckoning The air" → subtitle is "Reckoning"
              // Subtitles are usually title-case words, sentences have lowercase words after the first
              const sentencePattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}?)\s+([A-Z][a-z]+\s+[a-z])/;
              const cleanMatch = subtitle.match(sentencePattern);
              
              if (cleanMatch) {
                // Found sentence attached, use only the subtitle part
                chapterTitle = cleanMatch[1].trim();
                cleanChapterHeader = chapterPrefix + ' ' + chapterTitle;
              } else {
                // No sentence detected, use full subtitle
                chapterTitle = subtitle;
                cleanChapterHeader = fullChapterTitle;
              }
            } else if (!subtitleMatch) {
              // No subtitle, use default "Chapter X" format
              const chapterNumMatch = fullChapterTitle.match(/(?:Chapter|CHAPTER|Ch\.?)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|[IVX]+)/i);
              if (chapterNumMatch) {
                chapterTitle = `Chapter ${chapterNumMatch[1]}`;
                cleanChapterHeader = chapterTitle;
              }
            }
            
            // Calculate content start: find where the clean header ends in the original text
            const chapterStartPos = match.index!;
            const cleanHeaderInText = fullText.indexOf(cleanChapterHeader, chapterStartPos);
            let contentStartPos;
            
            if (cleanHeaderInText !== -1) {
              // Start after the clean header
              contentStartPos = cleanHeaderInText + cleanChapterHeader.length;
              // Skip any whitespace/newlines
              while (contentStartPos < fullText.length && /[\s\n]/.test(fullText[contentStartPos])) {
                contentStartPos++;
              }
            } else {
              // Fallback: use position after the full match
              contentStartPos = match.index! + match[0].length;
            }
            
            const endPos = index < matches.length - 1 ? matches[index + 1].index! : fullText.length;
            const chapterContent = fullText.substring(contentStartPos, endPos).trim();
            
            // Now normalize the chapter content (join single newlines, keep paragraph breaks)
            let normalizedContent = chapterContent;
            
            // Remove any single newlines (join sentences in same paragraph)
            // But preserve double newlines (actual paragraph breaks)
            normalizedContent = normalizedContent.replace(/([^\n])\n([^\n])/g, '$1 $2');
            
            // Clean up multiple spaces
            normalizedContent = normalizedContent.replace(/ {2,}/g, ' ');
            
            // Clean up any trailing/leading whitespace on each paragraph
            normalizedContent = normalizedContent.split('\n\n').map(para => para.trim()).join('\n\n');
            
            if (normalizedContent.length > 50) { // Only add if there's substantial content
              chapters.push({
                title: chapterTitle,
                content: normalizedContent
              });
            } else {
            }
          });
        } 
        
        // Strategy 2: If few or no chapters found, try page breaks
        if (chapters.length <= 1 && numPages > 1) {
          const pageTexts = fullText.split(/\n{4,}/); // Split on large gaps
          
          if (pageTexts.length > 1) {
            chapters = pageTexts
              .filter(text => text.trim().length > 100)
              .map((text, index) => {
                // Try to extract a title from the first line
                const lines = text.trim().split('\n');
                const firstLine = lines[0].trim();
                const isChapterTitle = /^(Chapter|CHAPTER)/i.test(firstLine) && firstLine.length < 50;
                
                let content = isChapterTitle ? lines.slice(1).join('\n').trim() : text.trim();
                
                // Normalize content
                content = content.replace(/([^\n])\n([^\n])/g, '$1 $2');
                content = content.replace(/ {2,}/g, ' ');
                content = content.split('\n\n').map(para => para.trim()).join('\n\n');
                
                if (isChapterTitle) {
                  return {
                    title: firstLine,
                    content: content
                  };
                } else {
                  return {
                    title: `Chapter ${index + 1}`,
                    content: content
                  };
                }
              });
          }
        }
        
        // Fallback: If still no chapters, treat as single chapter
        if (chapters.length === 0) {
          let content = fullText.trim();
          
          // Normalize content
          content = content.replace(/([^\n])\n([^\n])/g, '$1 $2');
          content = content.replace(/ {2,}/g, ' ');
          content = content.split('\n\n').map(para => para.trim()).join('\n\n');
          
          chapters = [{
            title: "Chapter 1",
            content: content
          }];
        }
        
        setChapters(chapters);
        
        // Show success message with chapter count
        if (chapters.length > 1) {
          setParseError("");
        } else {
          setParseError(`Note: Only 1 chapter detected. If your PDF has multiple chapters, ensure they're clearly marked with "Chapter X" headers.`);
        }
        
      } catch (error) {
        console.error("PDF parsing failed:", error);
        setParseError("Failed to parse PDF file.");
      } finally {
        setIsParsing(false);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (genres.length === 0) {
      return setError("Please select at least one genre")
    }

    // Allow submission even without chapters if author has notes or prologue
    if (chapters.length > 0 && chapters.some((chapter) => !chapter.content.trim())) {
      return setError("All chapters must have content")
    }

    // Ensure user has at least some content (chapters, author's note, or prologue)
    const hasChapters = chapters.length > 0 && chapters.some((chapter) => chapter.content.trim())
    const hasAuthorsNote = authorsNote.trim().length > 0
    const hasPrologue = prologue.trim().length > 0

    if (!hasChapters && !hasAuthorsNote && !hasPrologue) {
      return setError("Please add at least one chapter, author's note, or prologue before submitting")
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
        authorsNote: authorsNote || null,
        prologue: prologue || null,
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
    <div className="max-w-6xl mx-auto py-8">
      <SEOHead
        title="Submit Your Novel - NovlNest"
        description="Share your creative writing with the world on NovlNest. Submit your novel, story, or fiction work and connect with readers who love your genre."
        keywords="submit novel, publish story, creative writing, share fiction, writing platform, author tools, NovlNest"
        url="https://novlnest.com/submit"
        canonicalUrl="https://novlnest.com/submit"
      />

      {/* Header with beautiful styling */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-3">
            Share Your Story
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm italic">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Every story deserves to be told</span>
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
        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-6 mb-8 border border-purple-900/20">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-purple-900/30">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-xl font-serif font-bold text-purple-300">Novel Details</h2>
          </div>

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              Title
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white font-serif text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter your novel's title"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Description (one sentence)
            </label>
            <input
              id="description"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              value={description}
              onChange={handleDescriptionChange}
              required
              placeholder="Capture the essence in one line..."
            />
            <p className="mt-1 text-xs text-purple-300/60">{`${countSentences(description)} of 1 sentences used`}</p>
          </div>

          <div className="mb-6">
            <label htmlFor="summary" className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
              Summary
            </label>
            <textarea
              id="summary"
              className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[120px] leading-relaxed"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              placeholder="Write a compelling summary of your novel..."
            />
          </div>

          <div className="mb-6">
            <label htmlFor="authorsNote" className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              Author's Note (Optional)
            </label>
            <textarea
              id="authorsNote"
              className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[120px] leading-relaxed"
              value={authorsNote}
              onChange={(e) => setAuthorsNote(e.target.value)}
              placeholder="Share your thoughts with your readers..."
            />
            <p className="mt-1 text-xs text-purple-300/60">This will appear before the prologue and chapters</p>
          </div>

          <div className="mb-6">
            <label htmlFor="prologue" className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Prologue (Optional)
            </label>
            <textarea
              id="prologue"
              className="w-full px-4 py-3 rounded-lg border border-purple-900/30 bg-gray-900/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[120px] leading-relaxed font-serif"
              value={prologue}
              onChange={(e) => setPrologue(e.target.value)}
              placeholder="Begin your story with an intriguing prologue..."
            />
            <p className="mt-1 text-xs text-purple-300/60">This will appear after the author's note and before Chapter 1</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-purple-200/90 mb-2 flex items-center gap-2">
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
                className="block w-full text-sm text-purple-200/70
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-medium
                         file:bg-purple-900/40 file:text-purple-200
                         hover:file:bg-purple-800/60
                         cursor-pointer transition-all"
              />
              <p className="mt-1 text-xs text-purple-300/60">JPEG, PNG or WebP. Max 1MB. Recommended size: 800x600px.</p>
              {coverPreview && (
                <div className="relative inline-block">
                  <img
                    src={coverPreview || "/placeholder.svg"}
                    alt="Cover preview"
                    className="h-32 w-full object-cover rounded-lg shadow-lg border border-purple-900/30"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1.5 shadow-lg hover:bg-purple-600 transition-colors"
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
            <label className="block text-sm font-medium text-purple-200/90 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Genres (select at least one)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableGenres.map((genre) => (
                <label
                  key={genre}
                  className={`flex items-center justify-center px-3 py-2.5 rounded-lg border-2 ${genres.includes(genre)
                      ? "bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-900/20"
                      : "bg-gray-900/30 border-purple-900/20 text-gray-400 hover:bg-gray-900/50 hover:border-purple-800/30"
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

          <div>
            <label className="block text-sm font-medium text-purple-200/90 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Does your novel contain graphic or gory content?
            </label>
            <div className="flex gap-4">
              <label className={`flex items-center px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${hasGraphicContent === true
                  ? "bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/50 text-red-200"
                  : "bg-gray-900/30 border-purple-900/20 text-gray-400 hover:bg-gray-900/50"
                }`}>
                <input
                  type="radio"
                  name="graphicContent"
                  value="yes"
                  checked={hasGraphicContent === true}
                  onChange={() => setHasGraphicContent(true)}
                  className="sr-only"
                />
                <span className="font-medium">Yes</span>
              </label>
              <label className={`flex items-center px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${hasGraphicContent === false
                  ? "bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/50 text-green-200"
                  : "bg-gray-900/30 border-purple-900/20 text-gray-400 hover:bg-gray-900/50"
                }`}>
                <input
                  type="radio"
                  name="graphicContent"
                  value="no"
                  checked={hasGraphicContent === false}
                  onChange={() => setHasGraphicContent(false)}
                  className="sr-only"
                />
                <span className="font-medium">No</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-6 mb-8 border border-indigo-900/20">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-indigo-900/30">
            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-serif font-bold text-indigo-300">Import Chapters from PDF</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200/90 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
              Upload PDF (Optional)
            </label>
            <div className="mt-1">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePDFUpload}
                className="block w-full text-sm text-indigo-200/70
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-lg file:border-0
                 file:text-sm file:font-medium
                 file:bg-indigo-900/40 file:text-indigo-200
                 hover:file:bg-indigo-800/60
                 cursor-pointer transition-all"
              />
              <p className="mt-2 text-xs text-indigo-300/60">
                Upload a PDF file to automatically extract chapters with proper formatting. Supports various chapter formats: "Chapter 1", "CHAPTER 1", "Ch. 1", "Chapter One", etc.
              </p>
              {isParsing && (
                <div className="mt-3 text-indigo-300 flex items-center bg-indigo-900/20 px-4 py-2 rounded-lg">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Parsing PDF...
                </div>
              )}
              {parseError && (
                <div className="mt-3 text-yellow-300 bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-800/30">
                  {parseError}
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Chapters</h2>
            </div>
            <button
              type="button"
              onClick={addChapter}
              className="group inline-flex items-center px-4 py-2.5 border-2 border-purple-500/50 text-sm font-medium rounded-lg shadow-sm text-purple-200 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-800/60 hover:to-indigo-800/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all transform hover:scale-105"
            >
              <svg
                className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform"
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

          {chapters.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-purple-900/30 rounded-2xl p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-lg font-serif font-medium text-gray-300 mb-2">No chapters added yet</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  You can submit your novel with just the author's note and prologue, then add chapters later from your profile.
                </p>
              </div>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-6 mb-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Chapter {index + 1}</h3>
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
                  <div className="flex space-x-2 mb-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-gray-700 text-gray-200 text-xs hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onClick={() => setShowPreview((prev) => !prev)}
                    >
                      {showPreview ? "Show Preview" : "Hide Preview"}
                    </button>
                    <InlineChatEditor onAddChat={(messages) => insertChatIntoChapter(index, messages)} />
                  </div>
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
            ))
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            className="group inline-flex items-center px-8 py-4 border-2 border-transparent text-lg font-serif font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Publishing Your Story...
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
                Publish Your Novel
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SubmitNovel
