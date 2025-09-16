import React, { useState, useEffect, useRef } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { Search, User, X } from 'lucide-react'

interface User {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  bio?: string
}

interface UserSearchProps {
  isOpen: boolean
  onClose: () => void
  onUserSelect: (user: User) => void
}

const UserSearch: React.FC<UserSearchProps> = ({ isOpen, onClose, onUserSelect }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useAuth()
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Search users when query changes
  useEffect(() => {
    if (!isOpen) return

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setUsers([])
      return
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      await searchUsers(searchQuery.trim())
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isOpen])

  const searchUsers = async (searchQuery: string) => {
    if (!currentUser) return

    setIsLoading(true)
    setError(null)

    try {
      // Search by display name
      const usersQuery = collection(db, 'users')
      // Note: Firestore doesn't support text search natively
      // This is a simplified implementation - in production you'd use Algolia or similar
      const usersSnapshot = await getDocs(usersQuery)

      const foundUsers: User[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as any
        // Don't include current user in results and filter by search query
        if (doc.id !== currentUser.uid && 
            userData.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) {
          foundUsers.push({
            uid: doc.id,
            displayName: userData.displayName || 'Unknown User',
            email: userData.email || '',
            photoURL: userData.photoURL,
            bio: userData.bio
          })
        }
      })

      setUsers(foundUsers)
    } catch (err) {
      console.error('Error searching users:', err)
      setError('Failed to search users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = (user: User) => {
    onUserSelect(user)
    onClose()
    setSearchQuery('')
    setUsers([])
  }

  const handleClose = () => {
    onClose()
    setSearchQuery('')
    setUsers([])
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Find People to Message</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Searching...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : users.length === 0 && searchQuery.length >= 2 ? (
            <div className="p-4 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">No users found</p>
              <p className="text-sm text-gray-500">Try a different search term</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-400">Type at least 2 characters to search</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {users.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-3 rounded-lg hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{user.displayName}</h3>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 truncate mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserSearch
