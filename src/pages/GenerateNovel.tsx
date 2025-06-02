"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import OpenAI from "openai"
import type { ChatCompletion } from "openai/resources"
import { addNovel } from "../services/novelService"

const GenerateNovel = () => {
  const { currentUser } = useAuth()

  const [prompt, setPrompt] = useState("")
  const [genre, setGenre] = useState("Fantasy")
  const [numChapters, setNumChapters] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [generatedNovel, setGeneratedNovel] = useState<{
    title: string
    description: string
    summary: string
    chapters: { title: string; content: string }[]
  } | null>(null)
  const [generationProgress, setGenerationProgress] = useState<string>("")
  const [structure, setStructure] = useState<any | null>(null)

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
  ]

  // Initialize the OpenAI client
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser : true,
  })

  const generateNovel = async () => {
    if (!prompt.trim()) {
      return setError("Please enter a prompt")
    }

    try {
      setError("")
      setGenerating(true)
      setGenerationProgress("Generating novel structure...")

      // Generate novel structure with title and summary
      const structureResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative fiction writer specializing in crafting engaging novels.",
          },
          {
            role: "user",
            content: `Generate a ${genre} novel based on this prompt: "${prompt}". 
                     Return a JSON object with the following structure:
                     {
                       "title": "Novel Title",
                       "summary": "A compelling summary of the novel (about 150 words)",
                       "chapterTitles": ["Chapter 1 Title", "Chapter 2 Title", ...] (generate ${numChapters} chapter titles)
                     }`,
          },
        ],
        temperature: 0.8,
      })

      // Parse the novel structure
      const structureContent = structureResponse.choices[0].message.content || ""
      let parsedStructure
      try {
        // Find JSON in the response (in case the AI added extra text)
        const jsonMatch = structureContent.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : structureContent
        parsedStructure = JSON.parse(jsonString)
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError, structureContent)
        throw new Error("Failed to parse the AI response. Please try again.")
      }

      setStructure(parsedStructure)

      // Initialize chapters array and novel state
      const chapters = []
      setGeneratedNovel({
        title: parsedStructure.title,
        description: parsedStructure.description,
        summary: parsedStructure.summary,
        chapters: [],
      })

      // Generate each chapter
      for (let i = 0; i < parsedStructure.chapterTitles.length; i++) {
        const chapterTitle = parsedStructure.chapterTitles[i]
        setGenerationProgress(`Generating chapter ${i + 1} of ${parsedStructure.chapterTitles.length}: ${chapterTitle}`)
        const chapterResponse: ChatCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a creative fiction writer specializing in ${genre} novels.`,
            },
            {
              role: "user",
              content: `Write chapter ${i + 1} titled "${chapterTitle}" for a ${genre} novel titled "${parsedStructure.title}" with this summary: "${parsedStructure.summary}".
                       The novel is based on this prompt: "${prompt}".
                       Write a complete chapter with a beginning, middle, and end. The chapter should be about 1000-1500 words.
                       Previous chapters: ${chapters.map((c) => c.title).join(", ")}`,
            },
          ],
          temperature: 0.7,
        })
        const chapterContent: string = chapterResponse.choices[0].message.content || ""

        chapters.push({
          title: chapterTitle,
          content: chapterContent,
        })

        // Update the UI after each chapter is generated
        setGeneratedNovel({
          title: parsedStructure.title,
          description: parsedStructure.description,
          summary: parsedStructure.summary,
          chapters: [...chapters],
        })
      }

      setGenerationProgress("Novel generation complete!")
    } catch (error: any) {
      console.error("Error generating novel:", error)
      setError(`Failed to generate novel: ${error.message || "Unknown error"}`)
    } finally {
      setGenerating(false)
    }
  }

  const saveNovel = async () => {
    if (!generatedNovel || !currentUser) {
      setError("You must be logged in to save a novel")
      return
    }

    try {
      setSaving(true)
      setError("")

      const novelData = {
        title: generatedNovel.title,
        description: generatedNovel.description,
        summary: generatedNovel.summary,
        genres: [genre],
        chapters: generatedNovel.chapters,
        authorId: currentUser?.uid,
        authorName: "AI Assistant",
        isAIGenerated: true,
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generationPrompt: prompt,
        views: 0,
        likes: 0,
      }

      await addNovel(novelData)
      alert("Novel saved successfully!")

      // Reset form
      setPrompt("")
      setGenre("Fantasy")
      setNumChapters(3)
      setGeneratedNovel(null)
      setStructure(null)
    } catch (error) {
      console.error("Error saving novel:", error)
      setError("Failed to save novel. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 mt-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Generate AI Novel
        </h1>
        <p className="text-gray-400 mt-2">Create a complete novel with AI assistance in minutes</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-300 p-4 rounded-md mb-6 shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-100">Generation Settings</h2>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
              Your Novel Idea
            </label>
            <textarea
              id="prompt"
              className="w-full px-4 py-3 rounded-lg border border-gray-600 
                        bg-gray-700 text-gray-100 
                        focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        transition duration-200 min-h-[120px] shadow-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your novel idea in detail. For example: A story about a young wizard who discovers a hidden magical world..."
              disabled={generating || saving}
            />
            <p className="mt-1 text-sm text-gray-400">
              Be specific about characters, setting, and plot elements you want to include
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-gray-300 mb-2">
                Genre
              </label>
              <div className="relative">
                <select
                  id="genre"
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 
                            bg-gray-700 text-gray-100 
                            focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            transition duration-200 shadow-sm appearance-none"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  disabled={generating || saving}
                >
                  {availableGenres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="numChapters" className="block text-sm font-medium text-gray-300 mb-2">
                Number of Chapters
              </label>
              <input
                id="numChapters"
                type="number"
                className="w-full px-4 py-3 rounded-lg border border-gray-600 
                          bg-gray-700 text-gray-100 
                          focus:ring-2 focus:ring-purple-500 focus:border-transparent
                          transition duration-200 shadow-sm"
                value={numChapters}
                onChange={(e) => setNumChapters(Number.parseInt(e.target.value))}
                min={1}
                max={10}
                disabled={generating || saving}
              />
              <p className="mt-1 text-sm text-gray-400">
                We recommend 3-5 chapters for best results
              </p>
            </div>
          </div>

          <button
            type="button"
            className={`w-full py-3 px-6 rounded-lg font-medium text-white 
                      transition-all duration-200 shadow-md flex items-center justify-center
                      ${
                        generating || saving
                          ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      }`}
            onClick={generateNovel}
            disabled={generating || saving}
          >
            {generating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Generating...
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  ></path>
                </svg>
                Generate Novel
              </>
            )}
          </button>

          {generating && generationProgress && (
            <div className="mt-6 p-4 bg-purple-900/30 rounded-lg border border-purple-800">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent mr-3"></div>
                <div>
                  <p className="font-medium text-purple-300">{generationProgress}</p>
                  <p className="text-sm text-purple-400 mt-1">
                    This may take several minutes. Please don't close this page.
                  </p>
                </div>
              </div>
              <div className="w-full bg-purple-800 rounded-full h-1.5 mt-4">
                <div
                  className="bg-purple-600 h-1.5 rounded-full animate-pulse"
                  style={{
                    width: generationProgress.includes("complete")
                      ? "100%"
                      : generationProgress.includes("chapter") && structure
                        ? `${(Number.parseInt(generationProgress.split(" ")[2]) / structure.chapterTitles.length) * 100}%`
                        : "10%",
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {generatedNovel && (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-100">Generated Novel</h2>
            <button
              type="button"
              className={`py-2 px-4 rounded-lg font-medium text-white 
                        transition-all duration-200 shadow-sm flex items-center
                        ${
                          saving
                            ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        }`}
              onClick={saveNovel}
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    ></path>
                  </svg>
                  Save Novel
                </>
              )}
            </button>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-gray-100 mb-3">{generatedNovel.title}</h3>
              <div className="inline-block px-3 py-1 bg-purple-900/50 text-purple-800 text-sm font-medium rounded-full mb-4">
                {genre}
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-700 italic">
                <p className="text-gray-300">{generatedNovel.summary}</p>
              </div>
            </div>

            <div className="space-y-8">
              {generatedNovel.chapters.map((chapter, index) => (
                <div key={index} className="border-t border-gray-700 pt-6">
                  <h4 className="text-xl font-bold text-gray-100 mb-4 flex items-center">
                    <span className="flex items-center justify-center bg-purple-900/50 text-purple-800 w-8 h-8 rounded-full mr-2 text-sm font-bold">
                      {index + 1}
                    </span>
                    {chapter.title}
                  </h4>
                  <div className="prose-invert max-w-none">
                    {chapter.content.split("\n\n").map((paragraph, i) => (
                      <p key={i} className="text-gray-300 mb-4 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {generating && (
                <div className="flex items-center space-x-3 text-gray-400 py-4 border-t border-gray-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent"></div>
                  <span>Generating more content...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GenerateNovel
