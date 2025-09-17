import React, { useState, useEffect, useRef } from 'react'
import { useChat, type ChatConversation } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import UserSearch from './UserSearch'
import { 
  MessageCircle, 
  Search, 
  Send, 
  MoreVertical, 
  X,
  ChevronLeft,
  UserPlus,
  Trash2
} from 'lucide-react'

interface ChatInboxProps {
  isOpen: boolean
  onClose: () => void
}

const ChatInbox: React.FC<ChatInboxProps> = ({ isOpen, onClose }) => {
  const { state, loadConversations, setCurrentConversation, markAsRead, sendMessage, deleteMessage, loadMoreMessages, getUser, fetchUserData } = useChat()
  const { currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; conversationId: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  // Load conversations on mount
  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen, loadConversations])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  // Focus message input when conversation is selected
  useEffect(() => {
    if (state.currentConversation && messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }, [state.currentConversation])

  const handleConversationSelect = (conversation: ChatConversation) => {
    setCurrentConversation(conversation)
    markAsRead(conversation.id)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !state.currentConversation || !currentUser) return

    const receiverId = state.currentConversation.participants.find(id => id !== currentUser.uid)
    if (receiverId) {
      sendMessage(receiverId, messageInput.trim(), 'text')
      setMessageInput('')
    }
  }

  const handleUserSelect = async (user: any) => {
    // Create a new conversation with the selected user
    const newConversation: ChatConversation = {
      id: `${currentUser?.uid}_${user.uid}`.split('_').sort().join('_'),
      participants: [currentUser?.uid || '', user.uid],
      unreadCount: 0,
      lastActivity: Date.now(),
      isTyping: false,
      typingUsers: []
    }
    
    // Fetch user data for the selected user
    await fetchUserData(user.uid)
    
    setCurrentConversation(newConversation)
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
        console.error('Error deleting message:', error)
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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getOtherParticipant = (conversation: ChatConversation) => {
    if (!currentUser) return null
    return conversation.participants.find(id => id !== currentUser.uid)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 min-h-screen">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[80vh] max-h-[700px] min-h-[500px] flex flex-col sm:flex-row overflow-hidden mx-auto">
        {/* Sidebar - Conversations List */}
        <div className="w-full sm:w-1/3 bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-700 flex flex-col h-2/5 sm:h-full min-h-0">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Messages</h2>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="New Message"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Search Conversations"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5" />
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
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                />
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!Array.isArray(state.conversations) || state.conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle className="h-12 w-12 mb-4" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a conversation with someone!</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {state.conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation)
                  const user = getUser(otherParticipant || '')
                  const isActive = state.currentConversation?.id === conversation.id
                  
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation)}
                      className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                        isActive 
                          ? 'bg-purple-600/20 border border-purple-500/30' 
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="relative">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm sm:text-base">
                                {user?.displayName?.charAt(0).toUpperCase() || otherParticipant?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          {conversation.isTyping && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-medium truncate text-sm sm:text-base">
                              {user?.displayName || `User ${otherParticipant?.slice(-4) || 'Unknown'}`}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            {conversation.unreadCount > 0 && (
                              <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {state.currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                      onClick={() => setCurrentConversation(null)}
                      className="p-2 text-gray-400 hover:text-white transition-colors sm:hidden"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    
                    {(() => {
                      const otherParticipant = getOtherParticipant(state.currentConversation)
                      const user = getUser(otherParticipant || '')
                      return user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm sm:text-base">
                            {user?.displayName?.charAt(0).toUpperCase() || otherParticipant?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )
                    })()}
                    
                    <div>
                      <h3 className="text-white font-medium text-sm sm:text-base">
                        {(() => {
                          const otherParticipant = getOtherParticipant(state.currentConversation)
                          const user = getUser(otherParticipant || '')
                          return user?.displayName || `User ${otherParticipant?.slice(-4) || 'Unknown'}`
                        })()}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
                {/* Load More Button */}
                {state.hasMoreMessages && state.messages.length > 0 && (
                  <div className="flex justify-center py-2">
                    <button
                      onClick={() => loadMoreMessages(state.currentConversation?.id || '')}
                      disabled={state.isLoadingMore}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {state.isLoadingMore ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        'Load More Messages'
                      )}
                    </button>
                  </div>
                )}

                {/* Loading State for Conversation */}
                {state.currentConversation && state.loadingConversations.has(state.currentConversation.id) && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-sm sm:text-base">Loading messages...</p>
                  </div>
                )}

                {/* No Messages State */}
                {state.messages.length === 0 && state.currentConversation && !state.loadingConversations.has(state.currentConversation.id) && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base">No messages yet</p>
                    <p className="text-xs sm:text-sm">Start the conversation!</p>
                  </div>
                )}

                {/* Messages List */}
                {state.messages.length > 0 && state.currentConversation && !state.loadingConversations.has(state.currentConversation.id) && (
                  <>
                    {state.messages.map((message) => {
                      const isOwn = message.senderId === currentUser?.uid
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className="flex items-end">
                            <div
                              className={`sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                                isOwn
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-100'
                              }`}
                            >
                              <p className="text-sm sm:text-base break-words">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isOwn ? 'text-purple-200' : 'text-gray-400'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                            {isOwn && (
                              <button
                                onClick={() => handleDeleteMessage(message.id, state.currentConversation?.id || '')}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-2 sm:p-4 border-t border-gray-700 bg-gray-800">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-1 sm:space-x-2">
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full px-3 sm:px-4 py-2 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      <UserSearch
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onUserSelect={handleUserSelect}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Message</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatInbox
