import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Eye,
  Search
} from 'lucide-react'

interface SupportMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'unread' | 'in-progress' | 'resolved'
  createdAt: string
  timestamp: any
  ticketId?: string
  responses?: {
    adminName: string
    adminId: string
    message: string
    timestamp: string
  }[]
  userId?: string
}

const AdminSupport = () => {
  const { currentUser, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null)
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'in-progress' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/')
      return
    }

    const messagesQuery = query(
      collection(db, 'support_messages'),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages: SupportMessage[] = []
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as SupportMessage)
      })
      setMessages(fetchedMessages)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser, isAdmin, navigate])

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseText.trim() || !currentUser) return

    setSending(true)
    try {
      const messageRef = doc(db, 'support_messages', selectedMessage.id)
      const newResponse = {
        adminName: currentUser.displayName || 'Admin',
        adminId: currentUser.uid,
        message: responseText.trim(),
        timestamp: new Date().toISOString()
      }

      const updatedResponses = [...(selectedMessage.responses || []), newResponse]

      await updateDoc(messageRef, {
        responses: updatedResponses,
        status: 'in-progress',
        lastUpdated: new Date().toISOString()
      })

      // Send notification to user
      if (selectedMessage.userId) {
        await addDoc(collection(db, 'notifications'), {
          type: 'support_response',
          toUserId: selectedMessage.userId,
          ticketId: selectedMessage.ticketId,
          subject: selectedMessage.subject,
          createdAt: new Date().toISOString(),
          read: false
        })
      }

      setResponseText('')
      alert('Response sent successfully!')
    } catch (error) {
      console.error('Error sending response:', error)
      alert('Failed to send response. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (messageId: string, newStatus: 'unread' | 'in-progress' | 'resolved') => {
    try {
      const messageRef = doc(db, 'support_messages', messageId)
      await updateDoc(messageRef, {
        status: newStatus,
        lastUpdated: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const filteredMessages = messages.filter(msg => {
    const matchesStatus = filterStatus === 'all' || msg.status === filterStatus
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.ticketId && msg.ticketId.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'in-progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <AlertCircle className="h-4 w-4" />
      case 'in-progress': return <Clock className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      default: return <MessageCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Support Dashboard</h1>
              <p className="text-gray-400 text-lg">Manage and respond to user support tickets</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Tickets</p>
                <p className="text-3xl font-bold text-white">{messages.length}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-red-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium mb-1">Unread</p>
                <p className="text-3xl font-bold text-red-400">
                  {messages.filter(m => m.status === 'unread').length}
                </p>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-yellow-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium mb-1">In Progress</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {messages.filter(m => m.status === 'in-progress').length}
                </p>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"></div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-400">
                  {messages.filter(m => m.status === 'resolved').length}
                </p>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border border-gray-700 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
              <input
                type="text"
                placeholder="Search by name, email, ticket ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-5 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filterStatus === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('unread')}
                className={`px-5 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filterStatus === 'unread' 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/50' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterStatus('in-progress')}
                className={`px-5 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filterStatus === 'in-progress' 
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/50' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`px-5 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  filterStatus === 'resolved' 
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/50' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 text-center border border-gray-700 shadow-xl">
                <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-medium">No messages found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border cursor-pointer transition-all transform hover:scale-[1.02] shadow-lg ${
                    selectedMessage?.id === msg.id 
                      ? 'border-purple-500 shadow-purple-500/30 scale-[1.02]' 
                      : 'border-gray-700 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <p className="text-white font-semibold text-lg">{msg.name}</p>
                      <p className="text-gray-400 text-sm truncate">{msg.email}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(msg.status)}`}>
                      {getStatusIcon(msg.status)}
                      <span className="capitalize whitespace-nowrap">{msg.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <p className="text-gray-200 text-sm font-medium mb-2 line-clamp-1">{msg.subject}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      {msg.ticketId && (
                        <span className="bg-gray-700/50 px-2 py-1 rounded font-mono text-purple-400">
                          #{msg.ticketId}
                        </span>
                      )}
                    </span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  {msg.responses && msg.responses.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <span className="text-xs text-purple-400 font-medium">
                        {msg.responses.length} {msg.responses.length === 1 ? 'response' : 'responses'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Message Details */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-8 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">{selectedMessage.subject}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                          <span className="text-gray-400">From:</span>
                          <span className="text-white font-medium">{selectedMessage.name}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                          <span className="text-gray-400">Email:</span>
                          <span className="text-white font-medium">{selectedMessage.email}</span>
                        </div>
                        {selectedMessage.ticketId && (
                          <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-500/30">
                            <span className="text-purple-400 font-mono font-semibold">#{selectedMessage.ticketId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      value={selectedMessage.status}
                      onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value as any)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-semibold ${getStatusColor(selectedMessage.status)} cursor-pointer`}
                    >
                      <option value="unread">Unread</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Original Message */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Customer Message</h3>
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 border border-gray-600 shadow-lg">
                      <p className="text-gray-200 whitespace-pre-wrap text-base leading-relaxed">{selectedMessage.message}</p>
                      <div className="mt-4 pt-4 border-t border-gray-600 flex items-center justify-between">
                        <p className="text-gray-400 text-sm">
                          Submitted on {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Responses */}
                  {selectedMessage.responses && selectedMessage.responses.length > 0 && (
                    <div className="space-y-4 mb-8">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Responses</h3>
                      {selectedMessage.responses.map((response, index) => (
                        <div key={index} className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-2xl p-6 border border-purple-500/40 shadow-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{response.adminName.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-purple-300 font-semibold">{response.adminName}</p>
                              <p className="text-gray-400 text-xs">
                                {new Date(response.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-200 whitespace-pre-wrap text-base leading-relaxed">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response Form */}
                  <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-2xl p-6 border border-gray-600">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Send className="h-5 w-5 text-purple-400" />
                      Compose Response
                    </h3>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response here... (Be professional and helpful)"
                      rows={8}
                      className="w-full px-5 py-4 bg-gray-900/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-base leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-gray-400 text-sm">
                        {responseText.length} characters
                      </p>
                      <button
                        onClick={handleSendResponse}
                        disabled={!responseText.trim() || sending}
                        className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/30 transform hover:scale-105"
                      >
                        {sending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Sending Response...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Send Response
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-16 text-center shadow-xl">
                <Eye className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">No Message Selected</h3>
                <p className="text-gray-400 text-lg">Select a message from the list to view details and respond</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSupport

