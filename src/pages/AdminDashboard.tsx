"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"

const AdminDashboard: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"pending" | "published">("pending")

  useEffect(() => {
    fetchNovels()
  }, [activeTab])

  const fetchNovels = async () => {
    try {
      setLoading(true)

      const novelQuery = query(collection(db, "novels"), where("published", "==", activeTab === "published"))

      const querySnapshot = await getDocs(novelQuery)
      const novelsData: Novel[] = []

      querySnapshot.forEach((doc) => {
        novelsData.push({ id: doc.id, ...doc.data() } as Novel)
      })

      setNovels(novelsData)
    } catch (error) {
      console.error("Error fetching novels:", error)
      setError("Failed to load novels")
    } finally {
      setLoading(false)
    }
  }

  const approveNovel = async (id: string) => {
    try {
      await updateDoc(doc(db, "novels", id), {
        published: true,
        updatedAt: new Date().toISOString(),
      })

      fetchNovels()
    } catch (error) {
      console.error("Error approving novel:", error)
      setError("Failed to approve novel")
    }
  }

  const unpublishNovel = async (id: string) => {
    try {
      await updateDoc(doc(db, "novels", id), {
        published: false,
        updatedAt: new Date().toISOString(),
      })

      fetchNovels()
    } catch (error) {
      console.error("Error unpublishing novel:", error)
      setError("Failed to unpublish novel")
    }
  }

  const deleteNovel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this novel? This action cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, "novels", id))
      fetchNovels()
    } catch (error) {
      console.error("Error deleting novel:", error)
      setError("Failed to delete novel")
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="flex mb-6">
        <button
          className={`px-4 py-2 font-medium rounded-l-md ${
            activeTab === "pending"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Approval
        </button>
        <button
          className={`px-4 py-2 font-medium rounded-r-md ${
            activeTab === "published"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
          onClick={() => setActiveTab("published")}
        >
          Published
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : novels.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Chapters
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {novels.map((novel) => (
                <tr key={novel.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{novel.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{novel.authorName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        novel.isAIGenerated
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {novel.isAIGenerated ? "AI Generated" : "User Submitted"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{novel.chapters.length}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{new Date(novel.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/novel/${novel.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-900 mr-4"
                    >
                      View
                    </a>

                    {activeTab === "pending" ? (
                      <button
                        onClick={() => approveNovel(novel.id)}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => unpublishNovel(novel.id)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        Unpublish
                      </button>
                    )}

                    <button onClick={() => deleteNovel(novel.id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No novels found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === "pending" ? "There are no novels pending approval." : "There are no published novels."}
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
