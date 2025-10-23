"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
import type { Poem } from "../types/poem"
import type { ExtendedUser } from "../context/AuthContext"
import {
  FaChartBar,
  FaUsers,
  FaBook,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaEye,
  FaSearch,
  FaUserPlus,
  FaUserMinus,
  FaExclamationTriangle,
  FaSync
} from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { Link } from "react-router-dom"

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth()

  // State for novels
  const [novels, setNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [novelSearch, setNovelSearch] = useState("")
  const [novelTab, setNovelTab] = useState<"pending" | "published">("pending")

  // State for poems
  const [poems, setPoems] = useState<Poem[]>([])
  const [filteredPoems, setFilteredPoems] = useState<Poem[]>([])
  const [poemSearch, setPoemSearch] = useState("")
  const [poemTab, setPoemTab] = useState<"pending" | "published">("pending")

  // State for users
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>([])
  const [userSearch, setUserSearch] = useState("")

  // General state
  const [activeSection, setActiveSection] = useState<"overview" | "novels" | "poems" | "users">("overview")
  const [loading, setLoading] = useState<{
    novels: boolean
    poems: boolean
    users: boolean
    action: boolean
  }>({
    novels: true,
    poems: true,
    users: true,
    action: false,
  })
  const [error, setError] = useState<string>("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalAuthors: 0,
    novelAuthors: 0,
    poets: 0,
    totalNovels: 0,
    pendingNovels: 0,
    publishedNovels: 0,
    totalPoems: 0,
    pendingPoems: 0,
    publishedPoems: 0,
  })

  // Add admin check at the beginning of the component
  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchNovels()
    fetchPoems()
    // Set up real-time listener for users
    const usersQuery = query(collection(db, "users"))
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData: ExtendedUser[] = []
      snapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as ExtendedUser)
      })
      setUsers(usersData)
      setFilteredUsers(usersData)
      setLoading((prev) => ({ ...prev, users: false }))
    }, (error) => {
      console.error("Error listening to users:", error)
      setError("Failed to load users")
      setLoading((prev) => ({ ...prev, users: false }))
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  // Filter novels when search or tab changes
  useEffect(() => {
    if (novels.length > 0) {
      const filtered = novels
        .filter((novel) => novel.published === (novelTab === "published"))
        .filter(
          (novel) =>
            novel.title.toLowerCase().includes(novelSearch.toLowerCase()) ||
            novel.authorName.toLowerCase().includes(novelSearch.toLowerCase()),
        )
      setFilteredNovels(filtered)
    }
  }, [novels, novelSearch, novelTab])

  // Filter poems when search or tab changes
  useEffect(() => {
    if (poems.length > 0) {
      const filtered = poems
        .filter((poem) => poem.published === (poemTab === "published"))
        .filter(
          (poem) =>
            poem.title.toLowerCase().includes(poemSearch.toLowerCase()) ||
            poem.poetName.toLowerCase().includes(poemSearch.toLowerCase()),
        )
      setFilteredPoems(filtered)
    }
  }, [poems, poemSearch, poemTab])

  // Filter users when search changes
  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
          user.email?.toLowerCase().includes(userSearch.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [users, userSearch])

  // Calculate stats when data changes
  useEffect(() => {
    if (novels.length > 0 || poems.length > 0 || users.length > 0) {
      // Calculate unique authors (users who have submitted at least one novel or poem)
      const novelAuthorIds = new Set<string>()
      const poetIds = new Set<string>()
      const allAuthorIds = new Set<string>()
      
      novels.forEach((novel) => {
        if (novel.authorId) {
          novelAuthorIds.add(novel.authorId)
          allAuthorIds.add(novel.authorId)
        }
      })
      
      poems.forEach((poem) => {
        if (poem.poetId) {
          poetIds.add(poem.poetId)
          allAuthorIds.add(poem.poetId)
        }
      })
      
      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((user) => !user.disabled).length,
        totalAuthors: allAuthorIds.size,
        novelAuthors: novelAuthorIds.size,
        poets: poetIds.size,
        totalNovels: novels.length,
        pendingNovels: novels.filter((novel) => !novel.published).length,
        publishedNovels: novels.filter((novel) => novel.published).length,
        totalPoems: poems.length,
        pendingPoems: poems.filter((poem) => !poem.published).length,
        publishedPoems: poems.filter((poem) => poem.published).length,
      })
    }
  }, [novels, poems, users])

  const fetchNovels = async () => {
    try {
      setLoading((prev) => ({ ...prev, novels: true }))
      setError("")

      const novelsQuery = query(collection(db, "novels"))
      const querySnapshot = await getDocs(novelsQuery)
      const novelsData: Novel[] = []

      querySnapshot.forEach((doc) => {
        novelsData.push({ id: doc.id, ...doc.data() } as Novel)
      })

      setNovels(novelsData)
    } catch (error) {
      console.error("Error fetching novels:", error)
      setError("Failed to load novels")
    } finally {
      setLoading((prev) => ({ ...prev, novels: false }))
    }
  }

  const fetchPoems = async () => {
    try {
      setLoading((prev) => ({ ...prev, poems: true }))
      setError("")

      const poemsQuery = query(collection(db, "poems"))
      const querySnapshot = await getDocs(poemsQuery)
      const poemsData: Poem[] = []

      querySnapshot.forEach((doc) => {
        poemsData.push({ id: doc.id, ...doc.data() } as Poem)
      })

      setPoems(poemsData)
    } catch (error) {
      console.error("Error fetching poems:", error)
      setError("Failed to load poems")
    } finally {
      setLoading((prev) => ({ ...prev, poems: false }))
    }
  }

  const approveNovel = async (id: string) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "novels", id), {
        published: true,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setNovels((prev) => prev.map((novel) => (novel.id === id ? { ...novel, published: true } : novel)))
    } catch (error) {
      console.error("Error approving novel:", error)
      setError("Failed to approve novel")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const unpublishNovel = async (id: string) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "novels", id), {
        published: false,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setNovels((prev) => prev.map((novel) => (novel.id === id ? { ...novel, published: false } : novel)))
    } catch (error) {
      console.error("Error unpublishing novel:", error)
      setError("Failed to unpublish novel")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const deleteNovel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this novel? This action cannot be undone.")) {
      return
    }

    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await deleteDoc(doc(db, "novels", id))

      // Update local state
      setNovels((prev) => prev.filter((novel) => novel.id !== id))
    } catch (error) {
      console.error("Error deleting novel:", error)
      setError("Failed to delete novel")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const approvePoem = async (id: string) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "poems", id), {
        published: true,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setPoems((prev) => prev.map((poem) => (poem.id === id ? { ...poem, published: true } : poem)))
    } catch (error) {
      console.error("Error approving poem:", error)
      setError("Failed to approve poem")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const unpublishPoem = async (id: string) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "poems", id), {
        published: false,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setPoems((prev) => prev.map((poem) => (poem.id === id ? { ...poem, published: false } : poem)))
    } catch (error) {
      console.error("Error unpublishing poem:", error)
      setError("Failed to unpublish poem")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const deletePoem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this poem? This action cannot be undone.")) {
      return
    }

    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await deleteDoc(doc(db, "poems", id))

      // Update local state
      setPoems((prev) => prev.filter((poem) => poem.id !== id))
    } catch (error) {
      console.error("Error deleting poem:", error)
      setError("Failed to delete poem")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "users", uid), {
        disabled: !currentStatus,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, disabled: !currentStatus } : user)))
    } catch (error) {
      console.error("Error updating user status:", error)
      setError("Failed to update user status")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const toggleAdminStatus = async (uid: string, currentStatus: boolean) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }))
      setError("")

      await updateDoc(doc(db, "users", uid), {
        isAdmin: !currentStatus,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, isAdmin: !currentStatus } : user)))
    } catch (error) {
      console.error("Error updating admin status:", error)
      setError("Failed to update admin status")
    } finally {
      setLoading((prev) => ({ ...prev, action: false }))
    }
  }

  const refreshData = () => {
    fetchNovels()
    fetchPoems()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mt-4 mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={refreshData}
            disabled={loading.novels || loading.poems || loading.users}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-700 transition-colors"
          >
            <FaSync className={`h-4 w-4 ${loading.novels || loading.poems || loading.users ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6 flex items-center">
            <FaExclamationTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSection("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === "overview"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            <FaChartBar className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveSection("novels")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === "novels"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            <FaBook className="h-4 w-4" />
            Novels
          </button>
          <button
            onClick={() => setActiveSection("poems")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === "poems"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Poems
          </button>
          <button
            onClick={() => setActiveSection("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === "users"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            <FaUsers className="h-4 w-4" />
            Users
          </button>
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {/* Total Users Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Total Users</h3>
                  <FaUsers className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.activeUsers} active
                </p>
              </div>

              {/* Total Authors Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Total Authors</h3>
                  <FaUserPlus className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.totalAuthors}</div>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-xs text-gray-400">
                    <span className="text-purple-400 font-semibold">{stats.novelAuthors}</span> novelist{stats.novelAuthors !== 1 ? 's' : ''}
                  </p>
                  <span className="text-gray-600">•</span>
                  <p className="text-xs text-gray-400">
                    <span className="text-rose-400 font-semibold">{stats.poets}</span> poet{stats.poets !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Total Novels Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Total Novels</h3>
                  <FaBook className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.totalNovels}</div>
                <p className="text-xs text-gray-400">
                  {stats.publishedNovels} published (
                  {Math.round((stats.publishedNovels / stats.totalNovels) * 100) || 0}%)
                </p>
              </div>

              {/* Total Poems Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Total Poems</h3>
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">{stats.totalPoems}</div>
                <p className="text-xs text-gray-400">
                  {stats.publishedPoems} published (
                  {Math.round((stats.publishedPoems / stats.totalPoems) * 100) || 0}%)
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Recent Novels */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Recent Novels</h3>
                  <p className="text-sm text-gray-400">Latest novels submitted to the platform</p>
                </div>
                {loading.novels ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : novels.length > 0 ? (
                  <div className="space-y-4">
                    {novels.slice(0, 5).map((novel) => (
                      <div key={novel.id} className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <div>
                          <p className="font-medium">{novel.title}</p>
                          <p className="text-sm text-gray-400">By {novel.authorName}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            novel.published
                              ? "bg-green-900/50 text-green-300 border border-green-700"
                              : "bg-gray-700 text-gray-300 border border-gray-600"
                          }`}
                        >
                          {novel.published ? "Published" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-400">No novels found</p>
                )}
              </div>

              {/* Recent Poems */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Recent Poems</h3>
                  <p className="text-sm text-gray-400">Latest poems submitted to the platform</p>
                </div>
                {loading.poems ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : poems.length > 0 ? (
                  <div className="space-y-4">
                    {poems.slice(0, 5).map((poem) => (
                      <div key={poem.id} className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <div>
                          <p className="font-medium">{poem.title}</p>
                          <p className="text-sm text-gray-400">By {poem.poetName}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            poem.published
                              ? "bg-green-900/50 text-green-300 border border-green-700"
                              : "bg-gray-700 text-gray-300 border border-gray-600"
                          }`}
                        >
                          {poem.published ? "Published" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-400">No poems found</p>
                )}
              </div>

              {/* Recent Users */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Recent Users</h3>
                  <p className="text-sm text-gray-400">Latest users registered on the platform</p>
                </div>
                {loading.users ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : users.length > 0 ? (
                  <div className="space-y-4">
                    {users
                      .sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                        return dateB - dateA // Sort in descending order (newest first)
                      })
                      .slice(0, 5)
                      .map((user) => (
                      <div key={user.uid} className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <div className="flex items-center">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL || "/placeholder.svg"}
                              alt={user.displayName || "User"}
                              className="h-8 w-8 rounded-full mr-2 object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-600/20 flex items-center justify-center mr-2">
                              <span className="text-xs font-medium">
                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                              </span>
                            </div>
                          )}
                          <Link
                            to={`/profile/${user.uid}`}
                            className="font-medium hover:text-purple-400 transition-colors"
                          >
                            {user.displayName || "Anonymous User"}
                          </Link>
                        </div>
                        {user.isAdmin && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
                            Admin
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-400">No users found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Novels Section */}
        {activeSection === "novels" && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Novel Management</h3>
                  <p className="text-sm text-gray-400">Manage all novels on the platform</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FaSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="search"
                      placeholder="Search novels..."
                      className="pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-[250px]"
                      value={novelSearch}
                      onChange={(e) => setNovelSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex">
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
                        novelTab === "pending"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      }`}
                      onClick={() => setNovelTab("pending")}
                    >
                      Pending
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-r-lg border-l-0 border transition-colors ${
                        novelTab === "published"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      }`}
                      onClick={() => setNovelTab("published")}
                    >
                      Published
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading.novels ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredNovels.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Title</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Author</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Chapters</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Date</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNovels.map((novel) => (
                        <tr key={novel.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-3 px-4 font-medium">{novel.title}</td>
                          <td className="py-3 px-4 text-gray-300">{novel.authorName}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                novel.published
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                              }`}
                            >
                              {novel.published ? "Published" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{novel.chapters.length}</td>
                          <td className="py-3 px-4 text-gray-300">{new Date(novel.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/novel/${novel.id}`}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                              >
                                <FaEye className="h-4 w-4" />
                              </Link>

                              {novelTab === "pending" ? (
                                <button
                                  onClick={() => approveNovel(novel.id)}
                                  disabled={loading.action}
                                  className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                                >
                                  <FaCheckCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => unpublishNovel(novel.id)}
                                  disabled={loading.action}
                                  className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                                >
                                  <FaTimesCircle className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => deleteNovel(novel.id)}
                                disabled={loading.action}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaBook className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No novels found</h3>
                  <p className="text-sm text-gray-400">
                    {novelTab === "pending"
                      ? "There are no novels pending approval."
                      : "There are no published novels."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Poems Section */}
        {activeSection === "poems" && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Poem Management</h3>
                  <p className="text-sm text-gray-400">Manage all poems on the platform</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FaSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="search"
                      placeholder="Search poems..."
                      className="pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-[250px]"
                      value={poemSearch}
                      onChange={(e) => setPoemSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex">
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
                        poemTab === "pending"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      }`}
                      onClick={() => setPoemTab("pending")}
                    >
                      Pending
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-r-lg border-l-0 border transition-colors ${
                        poemTab === "published"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      }`}
                      onClick={() => setPoemTab("published")}
                    >
                      Published
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading.poems ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredPoems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Title</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Poet</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Genres</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Date</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPoems.map((poem) => (
                        <tr key={poem.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-3 px-4 font-medium">{poem.title}</td>
                          <td className="py-3 px-4 text-gray-300">{poem.poetName}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                poem.published
                                  ? "bg-rose-900/50 text-rose-300 border border-rose-700"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                              }`}
                            >
                              {poem.published ? "Published" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{poem.genres.slice(0, 2).join(", ")}</td>
                          <td className="py-3 px-4 text-gray-300">{new Date(poem.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/poem/${poem.id}`}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                              >
                                <FaEye className="h-4 w-4" />
                              </Link>

                              {poemTab === "pending" ? (
                                <button
                                  onClick={() => approvePoem(poem.id)}
                                  disabled={loading.action}
                                  className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                                >
                                  <FaCheckCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => unpublishPoem(poem.id)}
                                  disabled={loading.action}
                                  className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                                >
                                  <FaTimesCircle className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => deletePoem(poem.id)}
                                disabled={loading.action}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">No poems found</h3>
                  <p className="text-sm text-gray-400">
                    {poemTab === "pending"
                      ? "There are no poems pending approval."
                      : "There are no published poems."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeSection === "users" && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-sm text-gray-400">Manage all users on the platform</p>
                </div>
                <div className="relative">
                  <FaSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search users..."
                    className="pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-[250px]"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading.users ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-300">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Joined</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL || "/placeholder.svg"}
                                  alt={user.displayName || "User"}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                                  </span>
                                </div>
                              )}
                              <Link
                                to={`/profile/${user.uid}`}
                                className="font-medium hover:text-purple-400 transition-colors"
                              >
                                {user.displayName || "Anonymous User"}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{user.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.disabled
                                  ? "bg-red-900/50 text-red-300 border border-red-700"
                                  : "bg-green-900/50 text-green-300 border border-green-700"
                              }`}
                            >
                              {user.disabled ? "Disabled" : "Active"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.isAdmin
                                  ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                              }`}
                            >
                              {user.isAdmin ? "Admin" : "User"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toggleUserStatus(user.uid, user.disabled || false)}
                                disabled={loading.action}
                                className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                              >
                                {user.disabled ? (
                                  <FaUserPlus className="h-4 w-4 text-green-400" />
                                ) : (
                                  <FaUserMinus className="h-4 w-4 text-red-400" />
                                )}
                              </button>

                              <button
                                onClick={() => toggleAdminStatus(user.uid, user.isAdmin || false)}
                                disabled={loading.action}
                                className="px-2 py-1 text-xs font-medium rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                              >
                                {user.isAdmin ? (
                                  <span className="text-yellow-400">Remove Admin</span>
                                ) : (
                                  <span className="text-blue-400">Make Admin</span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaUsers className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No users found</h3>
                  <p className="text-sm text-gray-400">Try adjusting your search query</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
