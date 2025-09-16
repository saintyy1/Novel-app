import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { collection, doc, addDoc, updateDoc, setDoc, query, where, orderBy, onSnapshot, getDocs, serverTimestamp, deleteDoc, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

// Types
export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: number
  read: boolean
  type: 'text' | 'image' | 'file'
  metadata?: any
}

export interface ChatConversation {
  id: string
  participants: string[]
  lastMessage?: ChatMessage
  unreadCount: number
  lastActivity: number
  isTyping: boolean
  typingUsers: string[]
}

export interface ChatUser {
  id: string
  displayName: string
  photoURL?: string
  isOnline: boolean
  lastSeen?: number
}

interface ChatState {
  conversations: ChatConversation[]
  currentConversation: ChatConversation | null
  messages: ChatMessage[]
  users: Map<string, ChatUser>
  isConnected: boolean
  isLoading: boolean
  error: string | null
  searchResults: ChatMessage[]
  isSearching: boolean
  messageCache: Map<string, ChatMessage[]>
  hasMoreMessages: boolean
  isLoadingMore: boolean
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'CONVERSATIONS_LOADED'; payload: ChatConversation[] }
  | { type: 'MESSAGE_RECEIVED'; payload: { conversationId: string; message: ChatMessage; conversation: ChatConversation } }
  | { type: 'MESSAGE_SENT'; payload: { message: ChatMessage } }
  | { type: 'MESSAGES_LOADED'; payload: { conversationId: string; messages: ChatMessage[] } }
  | { type: 'MESSAGES_APPENDED'; payload: { conversationId: string; messages: ChatMessage[] } }
  | { type: 'MESSAGES_READ'; payload: { conversationId: string; userId: string } }
  | { type: 'MESSAGE_DELETED'; payload: { messageId: string; conversationId: string } }
  | { type: 'CONVERSATION_UPDATED'; payload: { conversationId: string; lastMessage?: ChatMessage } }
  | { type: 'SET_HAS_MORE_MESSAGES'; payload: { conversationId: string; hasMore: boolean } }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'TYPING_UPDATE'; payload: { conversationId: string; typingUsers: string[] } }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: ChatConversation | null }
  | { type: 'ADD_USER'; payload: ChatUser }
  | { type: 'UPDATE_USER'; payload: ChatUser }
  | { type: 'SET_USER'; payload: ChatUser }
  | { type: 'SEARCH_RESULTS'; payload: { query: string; results: ChatMessage[] } }
  | { type: 'SET_SEARCHING'; payload: boolean }

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  users: new Map(),
  isConnected: false,
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
  messageCache: new Map(),
  hasMoreMessages: false,
  isLoadingMore: false
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    
    case 'CONVERSATIONS_LOADED':
      return { ...state, conversations: action.payload, isLoading: false }
    
    case 'MESSAGE_RECEIVED':
      const { conversationId, message, conversation } = action.payload
      const conversations = Array.isArray(state.conversations) ? state.conversations : []
      const updatedConversations = conversations.map(conv => 
        conv.id === conversationId ? conversation : conv
      )
      
      // Add new conversation if it doesn't exist
      if (!conversations.find(conv => conv.id === conversationId)) {
        updatedConversations.unshift(conversation)
      }
      
      return {
        ...state,
        conversations: updatedConversations,
        messages: state.currentConversation?.id === conversationId 
          ? [...state.messages, message]
          : state.messages
      }
    
    case 'MESSAGE_SENT':
      return {
        ...state,
        messages: [...state.messages, action.payload.message]
      }
    
    case 'MESSAGES_LOADED':
      const newCache = new Map(state.messageCache)
      newCache.set(action.payload.conversationId, action.payload.messages)
      return {
        ...state,
        messages: action.payload.messages,
        messageCache: newCache,
        isLoading: false
      }
    
    case 'MESSAGES_APPENDED':
      const updatedCache = new Map(state.messageCache)
      const existingMessages = updatedCache.get(action.payload.conversationId) || []
      const combinedMessages = [...action.payload.messages, ...existingMessages]
      updatedCache.set(action.payload.conversationId, combinedMessages)
      return {
        ...state,
        messages: state.currentConversation?.id === action.payload.conversationId 
          ? combinedMessages 
          : state.messages,
        messageCache: updatedCache,
        isLoadingMore: false
      }
    
    case 'SET_HAS_MORE_MESSAGES':
      return {
        ...state,
        hasMoreMessages: action.payload.hasMore
      }
    
    case 'SET_LOADING_MORE':
      return {
        ...state,
        isLoadingMore: action.payload
      }
    
    case 'MESSAGES_READ':
      const { conversationId: readConvId, userId } = action.payload
      const conversationsForRead = Array.isArray(state.conversations) ? state.conversations : []
      return {
        ...state,
        conversations: conversationsForRead.map(conv => 
          conv.id === readConvId 
            ? { ...conv, unreadCount: 0 }
            : conv
        ),
        messages: Array.isArray(state.messages) ? state.messages.map(msg => 
          msg.receiverId === userId && !msg.read
            ? { ...msg, read: true }
            : msg
        ) : []
      }
    
    case 'MESSAGE_DELETED':
      const { messageId, conversationId: deleteConvId } = action.payload
      const filteredMessages = Array.isArray(state.messages) ? state.messages.filter(msg => msg.id !== messageId) : []
      
      return {
        ...state,
        messages: filteredMessages,
        conversations: Array.isArray(state.conversations) ? state.conversations.map(conv => {
          if (conv.id === deleteConvId && conv.lastMessage?.id === messageId) {
            // If deleted message was the last message, find the new last message from filtered messages
            const conversationMessages = filteredMessages.filter(msg => 
              conv.participants.includes(msg.senderId) && conv.participants.includes(msg.receiverId)
            )
            const newLastMessage = conversationMessages.length > 0 
              ? conversationMessages[conversationMessages.length - 1]
              : undefined
            
            return {
              ...conv,
              lastMessage: newLastMessage ? {
                id: newLastMessage.id,
                senderId: newLastMessage.senderId,
                receiverId: newLastMessage.receiverId,
                content: newLastMessage.content,
                timestamp: newLastMessage.timestamp,
                read: newLastMessage.read,
                type: newLastMessage.type
              } : undefined
            }
          }
          return conv
        }) : []
      }
    
    case 'CONVERSATION_UPDATED':
      const { conversationId: updateConvId, lastMessage: newLastMessage } = action.payload
      return {
        ...state,
        conversations: Array.isArray(state.conversations) ? state.conversations.map(conv => 
          conv.id === updateConvId 
            ? { ...conv, lastMessage: newLastMessage }
            : conv
        ) : []
      }
    
    case 'TYPING_UPDATE':
      const { conversationId: typingConvId, typingUsers } = action.payload
      const conversationsForTyping = Array.isArray(state.conversations) ? state.conversations : []
      return {
        ...state,
        conversations: conversationsForTyping.map(conv => 
          conv.id === typingConvId 
            ? { ...conv, typingUsers, isTyping: typingUsers.length > 0 }
            : conv
        )
      }
    
    case 'SET_CURRENT_CONVERSATION':
      return {
        ...state,
        currentConversation: action.payload,
        messages: action.payload ? [] : state.messages
      }
    
    case 'ADD_USER':
    case 'UPDATE_USER':
    case 'SET_USER':
      const newUsers = new Map(state.users)
      newUsers.set(action.payload.id, action.payload)
      return { ...state, users: newUsers }
    
    case 'SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload.results,
        isSearching: false
      }
    
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload }
    
    default:
      return state
  }
}

interface ChatContextType {
  state: ChatState
  sendMessage: (receiverId: string, content: string, type?: 'text' | 'image' | 'file') => void
  loadConversations: () => void
  loadMessages: (conversationId: string, loadMore?: boolean) => void
  loadMoreMessages: (conversationId: string) => void
  setCurrentConversation: (conversation: ChatConversation | null) => void
  markAsRead: (conversationId: string) => void
  deleteMessage: (messageId: string, conversationId: string) => Promise<void>
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  searchMessages: (query: string, conversationId?: string) => void
  getUser: (userId: string) => ChatUser | undefined
  addUser: (user: ChatUser) => void
  fetchUserData: (userId: string) => Promise<ChatUser | null>
  fetchUsersForConversations: (conversations: ChatConversation[]) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { currentUser } = useAuth()

  // Worker is no longer needed as Firebase handles real-time updates
  // This effect is kept for future WebSocket integration if needed
  useEffect(() => {
    if (currentUser) {
      console.log('Chat context initialized for user:', currentUser.uid)
      dispatch({ type: 'SET_CONNECTED', payload: true })
      // Future WebSocket initialization could go here
    }
  }, [currentUser])

  const sendMessage = useCallback(async (receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!currentUser) return

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: currentUser.uid,
      receiverId,
      content,
      type,
      timestamp: Date.now(),
      read: false
    }

    // Add optimistic message to UI immediately
    dispatch({ type: 'MESSAGE_SENT', payload: { message: optimisticMessage } })

    try {
      // Create message document
      const messageData = {
        senderId: currentUser.uid,
        receiverId,
        content,
        type,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: new Date().toISOString()
      }

      // Add message to messages collection
      const messageRef = await addDoc(collection(db, 'messages'), messageData)

      // Update or create conversation
      const conversationId = [currentUser.uid, receiverId].sort().join('_')
      const conversationRef = doc(db, 'conversations', conversationId)
      
      // Use setDoc with merge to create or update conversation
      await setDoc(conversationRef, {
        id: conversationId,
        participants: [currentUser.uid, receiverId],
        lastMessage: {
          id: messageRef.id,
          content,
          senderId: currentUser.uid,
          timestamp: serverTimestamp()
        },
        lastActivity: serverTimestamp(),
        unreadCount: 0,
        createdAt: serverTimestamp()
      }, { merge: true })

      // Send notification to receiver
      await addDoc(collection(db, 'notifications'), {
        toUserId: receiverId,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || 'Anonymous',
        type: 'message',
        messageContent: content,
        conversationId,
        createdAt: new Date().toISOString(),
        read: false
      })

    } catch (error) {
      console.error('Error sending message:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' })
    }
  }, [currentUser])

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('__name__', '==', userId)
      ))

      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data()
        const chatUser: ChatUser = {
          id: userId,
          displayName: userData.displayName || 'Unknown User',
          photoURL: userData.photoURL,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen?.toDate?.()?.getTime() || Date.now()
        }
        
        dispatch({ type: 'SET_USER', payload: chatUser })
        return chatUser
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
    return null
  }, [])

  const fetchUsersForConversations = useCallback(async (conversations: ChatConversation[]) => {
    if (!currentUser) return

    const userIds = new Set<string>()
    conversations.forEach(conv => {
      conv.participants.forEach(id => {
        if (id !== currentUser.uid) {
          userIds.add(id)
        }
      })
    })

    // Fetch all unique user IDs
    const userPromises = Array.from(userIds).map(userId => fetchUserData(userId))
    await Promise.all(userPromises)
  }, [currentUser, fetchUserData])

  const loadConversations = useCallback(async () => {
    if (!currentUser) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Load conversations from Firebase
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastActivity', 'desc')
      )

      const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
        const conversations: ChatConversation[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          conversations.push({
            id: doc.id,
            participants: data.participants || [],
            lastMessage: data.lastMessage ? {
              id: data.lastMessage.id,
              senderId: data.lastMessage.senderId,
              receiverId: data.participants.find((id: string) => id !== data.lastMessage.senderId) || '',
              content: data.lastMessage.content,
              timestamp: data.lastMessage.timestamp?.toDate?.()?.getTime() || Date.now(),
              read: data.lastMessage.read || false,
              type: 'text'
            } : undefined,
            unreadCount: data.unreadCount || 0,
            lastActivity: data.lastActivity?.toDate?.()?.getTime() || Date.now(),
            isTyping: false,
            typingUsers: []
          })
        })

        dispatch({ type: 'CONVERSATIONS_LOADED', payload: conversations })
        
        // Fetch user data for all participants
        fetchUsersForConversations(conversations)
      })

      // Store unsubscribe function for cleanup
      return unsubscribe
    } catch (error) {
      console.error('Error loading conversations:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations' })
    }
  }, [currentUser, fetchUsersForConversations])

  const loadMessages = useCallback(async (conversationId: string, loadMore: boolean = false) => {
    if (!currentUser) return

    // Check cache first for initial load
    const cachedMessages = state.messageCache.get(conversationId)
    if (cachedMessages && !loadMore) {
      dispatch({ type: 'MESSAGES_LOADED', payload: { conversationId, messages: cachedMessages } })
      
      // Set up real-time listener for new messages
      setupMessageListener(conversationId)
      return
    }

    if (loadMore) {
      dispatch({ type: 'SET_LOADING_MORE', payload: true })
    } else {
      dispatch({ type: 'SET_LOADING', payload: true })
    }

    try {
      // Get conversation participants and verify current user is a participant
      const conversationDoc = await getDocs(query(
        collection(db, 'conversations'),
        where('__name__', '==', conversationId)
      ))

      if (conversationDoc.empty) return

      const conversationData = conversationDoc.docs[0].data()
      const participants = conversationData.participants || []
      
      // SECURITY: Verify current user is a participant
      if (!participants.includes(currentUser.uid)) {
        console.error('Unauthorized access attempt to conversation:', conversationId)
        dispatch({ type: 'SET_ERROR', payload: 'Unauthorized access to conversation' })
        return
      }

      // Load messages for this conversation with pagination
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', 'in', participants),
        where('receiverId', 'in', participants),
        orderBy('timestamp', 'desc'),
        limit(50) // Load 50 messages at a time
      )

      const messagesSnapshot = await getDocs(messagesQuery)
      const messages: ChatMessage[] = []
      
      messagesSnapshot.forEach((doc) => {
        const data = doc.data()
        messages.push({
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          timestamp: data.timestamp?.toDate?.()?.getTime() || Date.now(),
          read: data.read || false,
          type: data.type || 'text',
          metadata: data.metadata
        })
      })

      // Sort messages by timestamp ascending for display
      messages.sort((a, b) => a.timestamp - b.timestamp)

      if (loadMore) {
        dispatch({ type: 'MESSAGES_APPENDED', payload: { conversationId, messages } })
      } else {
        dispatch({ type: 'MESSAGES_LOADED', payload: { conversationId, messages } })
        // Set up real-time listener for new messages after initial load
        setupMessageListener(conversationId)
      }

      // Set pagination state
      dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: { conversationId, hasMore: messages.length === 50 } })
    } catch (error) {
      console.error('Error loading messages:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' })
    }
  }, [currentUser, state.messageCache])

  const loadMoreMessages = useCallback(async (conversationId: string) => {
    await loadMessages(conversationId, true)
  }, [loadMessages])

  // Store active listeners
  const messageListeners = useRef<Map<string, () => void>>(new Map())
  const conversationListener = useRef<(() => void) | null>(null)

  const setupMessageListener = useCallback((conversationId: string) => {
    if (!currentUser) return

    // Clean up existing listener for this conversation
    const existingListener = messageListeners.current.get(conversationId)
    if (existingListener) {
      existingListener()
      messageListeners.current.delete(conversationId)
    }

    // Get conversation participants
    const conversation = state.conversations.find(conv => conv.id === conversationId)
    if (!conversation) return

    const participants = conversation.participants

    // Set up real-time listener for new messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('senderId', 'in', participants),
      where('receiverId', 'in', participants),
      orderBy('timestamp', 'desc'),
      limit(1) // Only listen for the most recent message
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if (snapshot.empty) return

      const latestDoc = snapshot.docs[0]
      const data = latestDoc.data()
      
      const newMessage: ChatMessage = {
        id: latestDoc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: data.timestamp?.toDate?.()?.getTime() || Date.now(),
        read: data.read || false,
        type: data.type || 'text',
        metadata: data.metadata
      }

      // Check if this message is already in our cached messages for this conversation
      const cachedMessages = state.messageCache.get(conversationId) || []
      const isNewMessage = !cachedMessages.some(msg => msg.id === newMessage.id)
      
      if (isNewMessage) {
        // Add to cache
        const updatedCache = [...cachedMessages, newMessage].sort((a, b) => a.timestamp - b.timestamp)
        
        const newCache = new Map(state.messageCache)
        newCache.set(conversationId, updatedCache)
        
        // Only update current messages if this is the active conversation
        if (state.currentConversation?.id === conversationId) {
          dispatch({ type: 'MESSAGES_LOADED', payload: { conversationId, messages: updatedCache } })
        }
        
        // Update conversation's last message
        dispatch({ type: 'CONVERSATION_UPDATED', payload: { 
          conversationId, 
          lastMessage: {
            id: newMessage.id,
            senderId: newMessage.senderId,
            receiverId: newMessage.receiverId,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            read: newMessage.read,
            type: newMessage.type
          }
        }})
      }
    })

    // Store the unsubscribe function
    messageListeners.current.set(conversationId, unsubscribe)
  }, [currentUser, state.conversations, state.messages, state.messageCache])

  const setCurrentConversation = useCallback((conversation: ChatConversation | null) => {
    // Clean up all existing message listeners
    messageListeners.current.forEach((unsubscribe: () => void) => {
      unsubscribe()
    })
    messageListeners.current.clear()

    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation })
    
    if (conversation) {
      loadMessages(conversation.id)
    }
  }, [loadMessages])

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      messageListeners.current.forEach((unsubscribe: () => void) => {
        unsubscribe()
      })
      messageListeners.current.clear()
      
      if (conversationListener.current) {
        conversationListener.current()
        conversationListener.current = null
      }
    }
  }, [])

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!currentUser) return

    try {
      // SECURITY: Verify user has access to this conversation
      const conversationDoc = await getDocs(query(
        collection(db, 'conversations'),
        where('__name__', '==', conversationId)
      ))

      if (!conversationDoc.empty) {
        const conversationData = conversationDoc.docs[0].data()
        const participants = conversationData.participants || []
        
        if (!participants.includes(currentUser.uid)) {
          console.error('Unauthorized access attempt to mark messages as read:', conversationId)
          return
        }
      }

      // Mark messages as read in Firebase
      const messagesQuery = query(
        collection(db, 'messages'),
        where('receiverId', '==', currentUser.uid),
        where('read', '==', false)
      )

      const messagesSnapshot = await getDocs(messagesQuery)
      const batch = messagesSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      )

      await Promise.all(batch)

      // Update conversation unread count
      const conversationRef = doc(db, 'conversations', conversationId)
      await setDoc(conversationRef, {
        unreadCount: 0
      }, { merge: true })

      dispatch({ type: 'MESSAGES_READ', payload: { conversationId, userId: currentUser.uid } })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [currentUser])

  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    if (!currentUser) return

    try {
      // SECURITY: Verify user has access to this conversation
      const conversationDoc = await getDocs(query(
        collection(db, 'conversations'),
        where('__name__', '==', conversationId)
      ))

      if (!conversationDoc.empty) {
        const conversationData = conversationDoc.docs[0].data()
        const participants = conversationData.participants || []
        
        if (!participants.includes(currentUser.uid)) {
          console.error('Unauthorized access attempt to delete message:', conversationId)
          dispatch({ type: 'SET_ERROR', payload: 'Unauthorized access to delete message' })
          return
        }
      }

      // Get the message to verify ownership
      const messageDoc = await getDocs(query(
        collection(db, 'messages'),
        where('__name__', '==', messageId)
      ))

      if (messageDoc.empty) {
        dispatch({ type: 'SET_ERROR', payload: 'Message not found' })
        return
      }

      const messageData = messageDoc.docs[0].data()
      
      // SECURITY: Only allow users to delete their own messages
      if (messageData.senderId !== currentUser.uid) {
        console.error('Unauthorized attempt to delete message not owned by user:', messageId)
        dispatch({ type: 'SET_ERROR', payload: 'You can only delete your own messages' })
        return
      }

      // Delete the message from Firebase
      await deleteDoc(doc(db, 'messages', messageId))

      // Update the conversation's last message if this was the last message
      const conversationRef = doc(db, 'conversations', conversationId)
      const conversationData = conversationDoc.docs[0].data()
      const participants = conversationData.participants || []
      
      if (conversationData.lastMessage?.id === messageId) {
        // Find the new last message
        const remainingMessagesQuery = query(
          collection(db, 'messages'),
          where('senderId', 'in', participants),
          where('receiverId', 'in', participants),
          orderBy('timestamp', 'desc'),
          limit(1)
        )
        
        const remainingMessagesSnapshot = await getDocs(remainingMessagesQuery)
        
        if (!remainingMessagesSnapshot.empty) {
          const newLastMessageData = remainingMessagesSnapshot.docs[0].data()
          const newLastMessage: ChatMessage = {
            id: remainingMessagesSnapshot.docs[0].id,
            senderId: newLastMessageData.senderId,
            receiverId: newLastMessageData.receiverId,
            content: newLastMessageData.content,
            timestamp: newLastMessageData.timestamp?.toDate?.()?.getTime() || Date.now(),
            read: newLastMessageData.read || false,
            type: newLastMessageData.type || 'text'
          }
          
          await setDoc(conversationRef, {
            lastMessage: {
              id: newLastMessage.id,
              content: newLastMessage.content,
              senderId: newLastMessage.senderId,
              timestamp: newLastMessage.timestamp
            }
          }, { merge: true })
          
          // Update local state with new last message
          dispatch({ type: 'CONVERSATION_UPDATED', payload: { conversationId, lastMessage: newLastMessage } })
        } else {
          // No more messages, clear last message
          await setDoc(conversationRef, {
            lastMessage: null
          }, { merge: true })
          
          // Update local state to clear last message
          dispatch({ type: 'CONVERSATION_UPDATED', payload: { conversationId, lastMessage: undefined } })
        }
      }

      // Update local state to remove message
      dispatch({ type: 'MESSAGE_DELETED', payload: { messageId, conversationId } })
      
    } catch (error) {
      console.error('Error deleting message:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete message' })
    }
  }, [currentUser])

  // Typing indicators could be implemented with Firebase in the future
  const startTyping = useCallback((conversationId: string) => {
    console.log('User started typing in conversation:', conversationId)
    // Future Firebase typing implementation could go here
  }, [])

  const stopTyping = useCallback((conversationId: string) => {
    console.log('User stopped typing in conversation:', conversationId)
    // Future Firebase typing implementation could go here
  }, [])

  // Search functionality could be implemented with Firebase or Algolia
  const searchMessages = useCallback((query: string, conversationId?: string) => {
    console.log('Searching messages:', { query, conversationId })
    // Future search implementation could go here
  }, [])

  const getUser = useCallback((userId: string) => {
    return state.users.get(userId)
  }, [state.users])

  const addUser = useCallback((user: ChatUser) => {
    dispatch({ type: 'ADD_USER', payload: user })
  }, [])

  const value: ChatContextType = {
    state,
    sendMessage,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    setCurrentConversation,
    markAsRead,
    deleteMessage,
    startTyping,
    stopTyping,
    searchMessages,
    getUser,
    addUser,
    fetchUserData,
    fetchUsersForConversations
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
