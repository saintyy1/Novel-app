"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useChat, type ChatConversation } from "../context/ChatContext"
import { useAuth } from "../context/AuthContext"
import UserSearch from "../components/UserSearch"
import SEOHead from "../components/SEOHead"
import { MessageCircle, Search, Send, MoreVertical, ArrowLeft, UserPlus, Trash2 } from "lucide-react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"

const Messages: React.FC = () => {
  const {
    state,
    loadConversations,
    setCurrentConversation,
    markAsRead,
    sendMessage,
    deleteMessage,
    loadMoreMessages,
    getUser,
    fetchUserData,
  } = useChat()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; conversationId: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConversations, setShowConversations] = useState(true) // For mobile toggle
  const messageInputRef = useRef<HTMLInputElement>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Handle user query parameter to open specific conversation
  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId && currentUser && userId !== currentUser.uid && 
        (!state.currentConversation || !state.currentConversation.participants.includes(userId))) {
      // Use a timeout to ensure conversations are loaded first
      const timer = setTimeout(() => {
        // Check if conversation already exists
        const existingConversation = state.conversations.find(conv => 
          conv.participants.includes(userId) && conv.participants.includes(currentUser.uid)
        )
        
        if (existingConversation) {
          // Open existing conversation
          setCurrentConversation(existingConversation)
          markAsRead(existingConversation.id)
          if (window.innerWidth < 768) {
            setShowConversations(false)
          }
        } else {
          // Create new conversation
          const newConversation: ChatConversation = {
            id: [currentUser.uid, userId].sort().join('_'),
            participants: [currentUser.uid, userId],
            unreadCount: 0,
            lastActivity: Date.now(),
            isTyping: false,
            typingUsers: [],
          }
          
          // Fetch user data for the selected user
          fetchUserData(userId).then(() => {
            setCurrentConversation(newConversation)
            if (window.innerWidth < 768) {
              setShowConversations(false)
            }
          })
        }
        
        // Clear the query parameter
        navigate('/messages', { replace: true })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [searchParams.get('user'), currentUser?.uid])


  // Hide conversations on mobile when a conversation is selected
  useEffect(() => {
    if (state.currentConversation && window.innerWidth < 768) {
      setShowConversations(false)
    }
  }, [state.currentConversation])

  const handleConversationSelect = (conversation: ChatConversation) => {
    setCurrentConversation(conversation)
    markAsRead(conversation.id)
    // On mobile, hide conversations list when selecting a conversation
    if (window.innerWidth < 768) {
      setShowConversations(false)
    }
  }

  const handleBackToConversations = () => {
    setCurrentConversation(null)
    setShowConversations(true)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !state.currentConversation || !currentUser) return

    const receiverId = state.currentConversation.participants.find((id) => id !== currentUser.uid)
    if (receiverId) {
      sendMessage(receiverId, messageInput.trim(), "text")
      setMessageInput("")
    }
  }

  const handleInputFocus = () => {
    // Only focus on desktop or when user explicitly taps the input
    if (window.innerWidth >= 768 && messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }

  const handleUserSelect = async (user: any) => {
    // Create a new conversation with the selected user
    const newConversation: ChatConversation = {
      id: `${currentUser?.uid}_${user.uid}`.split("_").sort().join("_"),
      participants: [currentUser?.uid || "", user.uid],
      unreadCount: 0,
      lastActivity: Date.now(),
      isTyping: false,
      typingUsers: [],
    }

    // Fetch user data for the selected user
    await fetchUserData(user.uid)

    setCurrentConversation(newConversation)
    // On mobile, hide conversations list when selecting a conversation
    if (window.innerWidth < 768) {
      setShowConversations(false)
    }
  }

  const handleDeleteMessage = (messageId: string, conversationId: string) => {
    setDeleteConfirm({ messageId, conversationId })
  }

  const confirmDelete = async () => {
    if (deleteConfirm) {
      setIsDeleting(true)
      try {
        await deleteMessage(deleteConfirm.messageId, deleteConfirm.conversationId)
        setDeleteConfirm(null)
      } catch (error) {
        console.error("Error deleting message:", error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
    setIsDeleting(false)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const getOtherParticipant = (conversation: ChatConversation) => {
    if (!currentUser) return null
    return conversation.participants.find((id) => id !== currentUser.uid)
  }

  // Filter conversations by search query (matches other participant's name or id)
  const filteredConversations = (() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return state.conversations
    return state.conversations.filter((conversation) => {
      const otherParticipant = getOtherParticipant(conversation)
      const user = getUser(otherParticipant || "")
      const name = (user?.displayName || "").toLowerCase()
      return name.includes(query)
    })
  })()

  // Show loading state when initially fetching conversations and messages
  if (state.loadingConversations.size > 0 && state.conversations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your messages</h2>
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
    <>
      <SEOHead
        title="Messages - NovlNest"
        description="Connect with fellow readers and writers. Send messages, share your thoughts, and build meaningful connections within the NovlNest community."
        keywords="messages, chat, direct messages, communication, community, readers, writers, conversations"
        url="https://novlnest.com/messages"
        canonicalUrl="https://novlnest.com/messages"
        type="website"
      />
      <div className="h-screen bg-gray-900 flex flex-col pt-8" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
        {/* Mobile Header */}
      <div className="md:hidden bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0 shadow-sm">
        {state.currentConversation ? (
          <>
            <button
              onClick={handleBackToConversations}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              {(() => {
                const otherParticipant = getOtherParticipant(state.currentConversation)
                const user = getUser(otherParticipant || "")
                return user?.photoURL ? (
                  <img
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-600">
                    <span className="text-white font-semibold text-sm">
                      {user?.displayName?.charAt(0).toUpperCase() || otherParticipant?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )
              })()}
              <h3 className="text-white font-semibold text-balance flex items-center gap-2">
                {(() => {
                  const otherParticipant = getOtherParticipant(state.currentConversation)
                  const user = getUser(otherParticipant || "")
                  const displayName = user?.displayName || `User ${otherParticipant?.slice(-4) || "Unknown"}`
                  return (
                    <>
                      {user?.isAdmin && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                          ADMIN
                        </span>
                      )}
                      {displayName}
                    </>
                  )
                })()}
              </h3>
            </div>
            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50">
              <MoreVertical className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-purple-600/10"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div
        className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden"
        style={{ height: "calc(100vh - 8rem)" }}
      >
        {/* Desktop Sidebar / Mobile Conversations List */}
        <div
          className={`${showConversations ? "flex" : "hidden"} md:flex w-full md:w-1/3 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-700 flex-col h-1/2 md:h-full min-h-0 shadow-lg md:shadow-none`}
        >
          {/* Desktop Header */}
          <div className="hidden md:block p-6 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Messages</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="p-2.5 text-gray-400 hover:text-purple-400 transition-colors rounded-xl hover:bg-purple-600/20 group"
                  title="New Message"
                >
                  <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2.5 text-gray-400 hover:text-purple-400 transition-colors rounded-xl hover:bg-purple-600/20 group"
                  title="Search Conversations"
                >
                  <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {showSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Mobile Header */}
          <div className="md:hidden p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Conversations</h2>
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh)' }}>
            {!Array.isArray(state.conversations) || state.conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                <div className="w-16 h-16 bg-gray-700/20 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <p className="text-center font-medium mb-2">No conversations yet</p>
                <p className="text-sm text-center opacity-75">Start a conversation with someone!</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredConversations.length === 0 ? (
                  <div className="text-center text-gray-400 py-6">No matching conversations</div>
                ) : filteredConversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation)
                  const user = getUser(otherParticipant || "")
                  const isActive = state.currentConversation?.id === conversation.id

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
                        isActive
                          ? "bg-purple-600/20 border border-purple-500/30 shadow-sm"
                          : "hover:bg-gray-700/30 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL || "/placeholder.svg"}
                              alt={user.displayName}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-600 group-hover:ring-purple-500/50 transition-all"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-600 group-hover:ring-purple-500/50 transition-all">
                              <span className="text-white font-semibold">
                                {user?.displayName?.charAt(0).toUpperCase() ||
                                  otherParticipant?.charAt(0).toUpperCase() ||
                                  "U"}
                              </span>
                            </div>
                          )}
                          {conversation.isTyping && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-white font-semibold truncate text-balance flex items-center gap-2">
                              {(() => {
                                const displayName = user?.displayName || `User ${otherParticipant?.slice(-4) || "Unknown"}`
                                return (
                                  <>
                                    {user?.isAdmin && (
                                      <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                                        ADMIN
                                      </span>
                                    )}
                                    <span className="truncate">{displayName}</span>
                                  </>
                                )
                              })()}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            {conversation.unreadCount > 0 && (
                              <span className="bg-purple-600 text-white text-xs rounded-full px-2.5 py-1 min-w-[24px] text-center font-medium shadow-sm">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
                }
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900" style={{ height: 'calc(100vh - 2rem - env(safe-area-inset-top))' }}>
          {state.currentConversation ? (
            <div className="flex flex-col h-full">
              {/* Desktop Chat Header */}
              <div className="hidden md:block p-6 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {(() => {
                      const otherParticipant = getOtherParticipant(state.currentConversation)
                      const user = getUser(otherParticipant || "")
                      return user?.photoURL ? (
                        <img
                          src={user.photoURL || "/placeholder.svg"}
                          alt={user.displayName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-600"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-600">
                          <span className="text-white font-semibold">
                            {user?.displayName?.charAt(0).toUpperCase() ||
                              otherParticipant?.charAt(0).toUpperCase() ||
                              "U"}
                          </span>
                        </div>
                      )
                    })()}

                    <div>
                      <h3 className="text-white font-semibold text-lg text-balance flex items-center gap-2">
                        {(() => {
                          const otherParticipant = getOtherParticipant(state.currentConversation)
                          const user = getUser(otherParticipant || "")
                          const displayName = user?.displayName || `User ${otherParticipant?.slice(-4) || "Unknown"}`
                          return (
                            <>
                              {user?.isAdmin && (
                                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  ADMIN
                                </span>
                              )}
                              {displayName}
                            </>
                          )
                        })()}
                      </h3>
                      <p className="text-gray-400 text-sm">Online</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-700/20">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-900 to-gray-900/95">
                {/* Load More Button */}
                {state.hasMoreMessages && state.messages.length > 0 && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={() => loadMoreMessages(state.currentConversation?.id || "")}
                      disabled={state.isLoadingMore}
                      className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      {state.isLoadingMore ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        "Load More Messages"
                      )}
                    </button>
                  </div>
                )}

                {/* No Messages State */}
                {state.messages.length === 0 && state.currentConversation && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-16 h-16 bg-gray-700/20 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8" />
                    </div>
                    <p className="font-medium mb-2">No messages yet</p>
                    <p className="text-sm opacity-75">Start the conversation!</p>
                  </div>
                )}

                {/* Messages List */}
                {state.messages.length > 0 && state.currentConversation && (
                    <>
                      {state.messages.map((message) => {
                        const isOwn = message.senderId === currentUser?.uid

                        return (
                          <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                            <div className="flex items-end max-w-[80%]">
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-sm ${
                                  isOwn
                                    ? "bg-purple-600 text-white rounded-br-md"
                                    : "bg-gray-700 text-gray-100 border border-gray-600 rounded-bl-md"
                                }`}
                              >
                                <p className="break-words leading-relaxed">{message.content}</p>
                                <p className={`text-xs mt-2 ${isOwn ? "text-purple-200" : "text-gray-400"}`}>
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                              {isOwn && (
                                <button
                                  onClick={() => handleDeleteMessage(message.id, state.currentConversation?.id || "")}
                                  className="p-2 text-gray-400 transition-colors ml-2 rounded-lg"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                     </>
                   )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-700 bg-gray-800/50 backdrop-blur-sm flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onFocus={handleInputFocus}
                      placeholder="Type a message..."
                      className="w-full px-6 py-4 bg-gray-700 border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-900 to-gray-800/5">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-700/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">Select a conversation</h3>
                <p className="text-gray-400">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      <UserSearch isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} onUserSelect={handleUserSelect} />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Delete Message</h3>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center font-medium"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default Messages
