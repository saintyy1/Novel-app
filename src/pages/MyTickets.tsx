import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Ticket,
  ArrowLeft
} from 'lucide-react'

interface SupportTicket {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'unread' | 'in-progress' | 'resolved'
  createdAt: string
  ticketId?: string
  responses?: {
    adminName: string
    adminId: string
    message: string
    timestamp: string
  }[]
  userId?: string
}

const MyTickets = () => {
  const { currentUser } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const ticketsQuery = query(
      collection(db, 'support_messages'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const fetchedTickets: SupportTicket[] = []
      snapshot.forEach((doc) => {
        fetchedTickets.push({ id: doc.id, ...doc.data() } as SupportTicket)
      })
      setTickets(fetchedTickets)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your tickets</h2>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 pb-16">
      <SEOHead
        title="My Support Tickets - NovlNest"
        description="View and manage your support tickets on NovlNest."
        keywords="support tickets, help, customer service"
        url="https://novlnest.com/my-tickets"
        canonicalUrl="https://novlnest.com/my-tickets"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/support" 
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 text-lg font-medium transition-all hover:gap-3"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Support
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Ticket className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">My Support Tickets</h1>
              <p className="text-gray-400 text-lg">View your support requests and admin responses</p>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-16 text-center shadow-xl">
            <Ticket className="h-20 w-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">No support tickets yet</h3>
            <p className="text-gray-400 text-lg mb-8">You haven't submitted any support requests</p>
            <Link
              to="/support"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30 transform hover:scale-105"
            >
              <MessageCircle className="h-5 w-5" />
              Contact Support
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-1 space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border cursor-pointer transition-all transform hover:scale-[1.02] shadow-lg ${
                    selectedTicket?.id === ticket.id 
                      ? 'border-purple-500 shadow-purple-500/30 scale-[1.02]' 
                      : 'border-gray-700 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <p className="text-white font-semibold text-lg mb-2">{ticket.subject}</p>
                      {ticket.ticketId && (
                        <span className="bg-gray-700/50 px-2 py-1 rounded font-mono text-purple-400 text-xs">
                          #{ticket.ticketId}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="capitalize whitespace-nowrap">{ticket.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{ticket.message}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.responses && ticket.responses.length > 0 && (
                      <span className="text-purple-400 font-medium">
                        {ticket.responses.length} {ticket.responses.length === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ticket Details */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="p-8 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-white mb-3">{selectedTicket.subject}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {selectedTicket.ticketId && (
                            <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-500/30">
                              <span className="text-purple-400 font-mono font-semibold">#{selectedTicket.ticketId}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                            <span className="text-gray-400">Created:</span>
                            <span className="text-white font-medium">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusIcon(selectedTicket.status)}
                        <span className="capitalize">
                          {selectedTicket.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    {/* Original Message */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Message</h3>
                      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 border border-gray-600 shadow-lg">
                        <p className="text-gray-200 whitespace-pre-wrap text-base leading-relaxed">{selectedTicket.message}</p>
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <p className="text-gray-400 text-sm">
                            Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Responses */}
                    {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Support Team Responses</h3>
                        {selectedTicket.responses.map((response, index) => (
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
                    ) : (
                      <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-2xl p-12 text-center border border-gray-600">
                        <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No responses yet</h3>
                        <p className="text-gray-400 text-base">Our support team will respond within 24 hours</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-16 text-center shadow-xl">
                  <MessageCircle className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">No Ticket Selected</h3>
                  <p className="text-gray-400 text-lg">Select a ticket from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyTickets

