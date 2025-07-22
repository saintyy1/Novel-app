export interface Novel {
  id: string
  title: string
  description: string
  summary: string
  genres: string[]
  chapters: {
    title: string
    content: string
  }[]
  authorId: string
  authorName: string
  isAIGenerated: boolean
  published: boolean
  createdAt: string
  updatedAt: string
  generationPrompt?: string
  likes?: number
  views?: number
  likedBy?: string[] // Array of user IDs who liked the novel
  coverImage?: string | null
}
