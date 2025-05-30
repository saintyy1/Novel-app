import type React from "react"
import { Link } from "react-router-dom"
import type { Novel } from "../types/novel"

interface NovelCardProps {
  novel: Novel
}

const NovelCard: React.FC<NovelCardProps> = ({ novel }) => {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-bold mb-2">{novel.title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        By {novel.authorName} • {novel.isAIGenerated ? "AI Generated" : "User Submitted"}
      </p>
      <p className="text-sm mb-4 line-clamp-3">{novel.summary}</p>
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {novel.genres.map((genre, index) => (
            <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded-full">
              {genre}
            </span>
          ))}
        </div>
        <Link to={`/novel/${novel.id}`} className="btn btn-primary text-sm">
          Read Now
        </Link>
      </div>
    </div>
  )
}

export default NovelCard
