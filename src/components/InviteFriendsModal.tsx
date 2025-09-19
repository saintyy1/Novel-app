import React, { useState, useEffect } from 'react'
import { X, Mail, Users, Send, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { sendInvitationEmail } from '../services/invitationService'
import { showSuccessToast, showErrorToast } from '../utils/toast-utils'

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
}

const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser) {
      showErrorToast('Please log in to send invitations')
      return
    }

    if (!email.trim()) {
      showErrorToast('Please enter an email address')
      return
    }

    setIsLoading(true)
    
    try {
      const result = await sendInvitationEmail(
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.email || '',
        email.trim(),
        message.trim() || undefined
      )

      if (result.success) {
        showSuccessToast('Invitation sent successfully!')
        setEmail('')
        setMessage('')
      } else {
        showErrorToast(result.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      showErrorToast('Failed to send invitation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setMessage('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Invite Friends</h3>
              <p className="text-sm text-gray-400">Share NovlNest with your friends</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Friend's Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey! Check out this amazing novel platform..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={isLoading}
                maxLength={200}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {message.length}/200
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-400">
              <p className="font-medium text-gray-300 mb-1">How it works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Your friend will receive an email invitation</li>
                <li>• They can join using the link in the email</li>
                <li>• You'll get credit when they sign up!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InviteFriendsModal
