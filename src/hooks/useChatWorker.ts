import { useEffect, useRef, useCallback } from 'react'
import { useChat } from '../context/ChatContext'

interface UseChatWorkerOptions {
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export const useChatWorker = (options: UseChatWorkerOptions = {}) => {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options

  const { state, loadConversations, sendMessage } = useChat()
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Auto-connect when component mounts
  useEffect(() => {
    if (autoConnect && state.isConnected) {
      loadConversations()
    }
  }, [autoConnect, state.isConnected, loadConversations])

  // Handle reconnection logic
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`Attempting to reconnect to chat service (attempt ${reconnectAttempts.current})`)
        loadConversations()
      }, reconnectInterval)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }, [reconnectInterval, maxReconnectAttempts, loadConversations])

  // Reset reconnection attempts on successful connection
  useEffect(() => {
    if (state.isConnected) {
      reconnectAttempts.current = 0
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    } else if (autoConnect) {
      handleReconnect()
    }
  }, [state.isConnected, autoConnect, handleReconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  // Send message with error handling
  const sendMessageWithRetry = useCallback((
    receiverId: string, 
    content: string, 
    type: 'text' | 'image' | 'file' = 'text'
  ) => {
    try {
      sendMessage(receiverId, content, type)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Could implement retry logic here
    }
  }, [sendMessage])

  // Get conversation by participant ID
  const getConversationByParticipant = useCallback((participantId: string) => {
    return state.conversations.find(conv => 
      conv.participants.includes(participantId)
    )
  }, [state.conversations])

  // Get unread count for specific conversation
  const getUnreadCount = useCallback((conversationId: string) => {
    const conversation = state.conversations.find(conv => conv.id === conversationId)
    return conversation?.unreadCount || 0
  }, [state.conversations])

  // Get total unread count across all conversations
  const getTotalUnreadCount = useCallback(() => {
    return state.conversations.reduce((total, conv) => total + conv.unreadCount, 0)
  }, [state.conversations])

  // Check if user is typing in specific conversation
  const isUserTyping = useCallback((conversationId: string, userId: string) => {
    const conversation = state.conversations.find(conv => conv.id === conversationId)
    return conversation?.typingUsers.includes(userId) || false
  }, [state.conversations])

  return {
    // State
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    conversations: state.conversations,
    currentConversation: state.currentConversation,
    messages: state.messages,
    searchResults: state.searchResults,
    isSearching: state.isSearching,

    // Actions
    sendMessage: sendMessageWithRetry,
    loadConversations,
    getConversationByParticipant,
    getUnreadCount,
    getTotalUnreadCount,
    isUserTyping,

    // Reconnection info
    reconnectAttempts: reconnectAttempts.current,
    canReconnect: reconnectAttempts.current < maxReconnectAttempts
  }
}
