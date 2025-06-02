"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import type { Novel } from "../types/novel"
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
  FaSync,
  FaLightbulb,
} from "react-icons/fa"
import { useAuth } from "../context/AuthContext"

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth()

  // State for novels
  const [novels, setNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [novelSearch, setNovelSearch] = useState("")
  const [novelTab, setNovelTab] = useState<"pending" | "published">("pending")

  // State for users
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>([])
  const [userSearch, setUserSearch] = useState("")

  // General state
  const [activeSection, setActiveSection] = useState<"overview" | "novels" | "users">("overview")
  const [loading, setLoading] = useState<{
    novels: boolean
    users: boolean
    action: boolean
  }>({
    novels: true,
    users: true,
    action: false,
  })
  const [error, setError] = useState<string>("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalNovels: 0,
    pendingNovels: 0,
    publishedNovels: 0,
    aiGeneratedNovels: 0,
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
    if (novels.length > 0 || users.length > 0) {
      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((user) => !user.disabled).length,
        totalNovels: novels.length,
        pendingNovels: novels.filter((novel) => !novel.published).length,
        publishedNovels: novels.filter((novel) => novel.published).length,
        aiGeneratedNovels: novels.filter((novel) => novel.isAIGenerated).length,
      })
    }
  }, [novels, users])

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
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mt-4 mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={refreshData}
            disabled={loading.novels || loading.users}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-700 transition-colors"
          >
            <FaSync className={`h-4 w-4 ${loading.novels || loading.users ? "animate-spin" : ""}`} />
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {/* Total Users Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Total Users</h3>
                  <FaUsers className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                
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

              {/* AI Generated Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">AI Generated</h3>
                  <FaLightbulb className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.aiGeneratedNovels}</div>
                <p className="text-xs text-gray-400">
                  {Math.round((stats.aiGeneratedNovels / stats.totalNovels) * 100) || 0}% of all novels
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                          <a 
                            href={`/profile/${user.uid}`}
                            className="font-medium hover:text-purple-400 transition-colors"
                          >
                            {user.displayName || "Anonymous User"}
                          </a>
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
                                novel.isAIGenerated
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                              }`}
                            >
                              {novel.isAIGenerated ? "AI" : "User"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{novel.chapters.length}</td>
                          <td className="py-3 px-4 text-gray-300">{new Date(novel.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => window.open(`/novel/${novel.id}`, "_blank")}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                              >
                                <FaEye className="h-4 w-4" />
                              </button>

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
                              <a 
                                href={`/profile/${user.uid}`}
                                className="font-medium hover:text-purple-400 transition-colors"
                              >
                                {user.displayName || "Anonymous User"}
                              </a>
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
