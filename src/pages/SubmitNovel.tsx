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
        
        // Debug: Log a sample of the extracted text BEFORE normalization
        console.log('PDF Text Sample BEFORE normalization (first 500 chars):', fullText.substring(0, 500));
        console.log('PDF Text Sample BEFORE normalization (chars 500-1000):', fullText.substring(500, 1000));
        
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
        
        console.log(`Found ${matches.length} chapter markers in PDF`);
        matches.forEach((match, i) => {
          console.log(`Chapter ${i + 1} FULL MATCH: "${match[0]}"`);
          console.log(`Chapter ${i + 1} captured group: "${match[1]}"`);
          console.log(`Chapter ${i + 1} position: ${match.index}`);
          // Show what comes after the match
          const afterMatch = fullText.substring(match.index! + match[0].length, match.index! + match[0].length + 100);
          console.log(`Chapter ${i + 1} text after: "${afterMatch}"`);
        });
        
        if (matches.length > 0) {
          matches.forEach((match, index) => {
            const fullChapterTitle = match[1].trim();
            
            // Extract clean subtitle first (e.g., "Chapter One - The Beginning" -> "The Beginning")
            let chapterTitle = fullChapterTitle;
            let cleanChapterHeader = fullChapterTitle; // The actual chapter header without sentence content
            console.log(`Processing full chapter title: "${fullChapterTitle}"`);
            
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
                console.log(`Cleaned subtitle: "${chapterTitle}" (removed sentence: "${cleanMatch[2].trim()}...")  from "${subtitle}"`);
              } else {
                // No sentence detected, use full subtitle
                chapterTitle = subtitle;
                cleanChapterHeader = fullChapterTitle;
                console.log(`Extracted subtitle: "${chapterTitle}" from "${fullChapterTitle}"`);
              }
            } else if (!subtitleMatch) {
              // No subtitle, use default "Chapter X" format
              const chapterNumMatch = fullChapterTitle.match(/(?:Chapter|CHAPTER|Ch\.?)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|[IVX]+)/i);
              if (chapterNumMatch) {
                chapterTitle = `Chapter ${chapterNumMatch[1]}`;
                cleanChapterHeader = chapterTitle;
                console.log(`No subtitle found, using: "${chapterTitle}"`);
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
            
            console.log(`Chapter "${chapterTitle}" content preview: "${normalizedContent.substring(0, 100)}..."`);
            console.log(`Chapter "${chapterTitle}" content length: ${normalizedContent.length} chars`);
            
            if (normalizedContent.length > 50) { // Only add if there's substantial content
              chapters.push({
                title: chapterTitle,
                content: normalizedContent
              });
            } else {
              console.warn(`Skipping "${chapterTitle}" - content too short (${normalizedContent.length} chars)`);
            }
          });
        } 
        
        // Strategy 2: If few or no chapters found, try page breaks
        if (chapters.length <= 1 && numPages > 1) {
          console.log('Using page-based chapter detection');
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
        
        console.log(`Final chapter count: ${chapters.length}`);
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
    <div className="max-w-4xl mx-auto py-8">
      <SEOHead
        title="Submit Your Novel - NovlNest"
        description="Share your creative writing with the world on NovlNest. Submit your novel, story, or fiction work and connect with readers who love your genre."
        keywords="submit novel, publish story, creative writing, share fiction, writing platform, author tools, NovlNest"
        url="https://novlnest.com/submit"
        canonicalUrl="https://novlnest.com/submit"
      />

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
            <label htmlFor="authorsNote" className="block text-sm font-medium text-gray-300 mb-1">
              Author's Note (Optional)
            </label>
            <textarea
              id="authorsNote"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors min-h-[120px]"
              value={authorsNote}
              onChange={(e) => setAuthorsNote(e.target.value)}
              placeholder="Write a personal note to your readers (optional)"
            />
            <p className="mt-1 text-xs text-gray-400">This will appear before the prologue and chapters</p>
          </div>

          <div className="mb-6">
            <label htmlFor="prologue" className="block text-sm font-medium text-gray-300 mb-1">
              Prologue (Optional)
            </label>
            <textarea
              id="prologue"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors min-h-[120px]"
              value={prologue}
              onChange={(e) => setPrologue(e.target.value)}
              placeholder="Write your prologue (optional)"
            />
            <p className="mt-1 text-xs text-gray-400">This will appear after the author's note and before Chapter 1</p>
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

        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-300 border-b border-gray-700 pb-2">
            Import Chapters from PDF
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload PDF (Optional)
            </label>
            <div className="mt-1">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePDFUpload}
                className="block w-full text-sm text-gray-400
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-md file:border-0
                 file:text-sm file:font-medium
                 file:bg-purple-900 file:text-purple-200
                 hover:file:bg-purple-800
                 cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-400">
                Upload a PDF file to automatically extract chapters with proper formatting. Supports various chapter formats: "Chapter 1", "CHAPTER 1", "Ch. 1", "Chapter One", etc.
              </p>
              {isParsing && (
                <div className="mt-2 text-purple-400 flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Parsing PDF...
                </div>
              )}
              {parseError && (
                <div className="mt-2 text-red-400">
                  {parseError}
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Chapters</h2>
            </div>
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

          {chapters.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No chapters added yet</h3>
                <p className="text-sm text-gray-400">
                  You can submit your novel with just the author's note and prologue, then add chapters later from your profile.
                </p>
              </div>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div key={index} className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-purple-500">
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
