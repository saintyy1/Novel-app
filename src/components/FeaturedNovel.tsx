import type React from "react"
import { Link } from "react-router-dom"
import type { Novel } from "../types/novel"

interface FeaturedNovelProps {
  novel: Novel
}

const FeaturedNovel: React.FC<FeaturedNovelProps> = ({ novel }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
      <div className="md:flex">
        <div className="md:flex-shrink-0 md:w-2/5 h-64 md:h-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 to-red-600/90 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-[url('/two-worlds-cover.png')] bg-cover bg-center"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-6 py-4 text-center">
              <h3 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{novel.title}</h3>
            </div>
          </div>
        </div>
        <div className="p-8 md:w-3/5">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">
            {novel.genres.join(" • ")}
          </div>
          <Link
            to={`/novel/${novel.id}`}
            className="block mt-1 text-2xl leading-tight font-bold text-gray-900 dark:text-white hover:underline"
          >
            {novel.title}
          </Link>
          <p className="mt-2 text-gray-600 dark:text-gray-300">By {novel.authorName}</p>
          <p className="mt-4 text-gray-500 dark:text-gray-400 line-clamp-4">{novel.summary}</p>
          <div className="mt-6 flex items-center">
            <span className="text-sm text-indigo-500">
              Featured Novel
            </span>
            <Link
              to={`/novel/${novel.id}`}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Read Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeaturedNovel
