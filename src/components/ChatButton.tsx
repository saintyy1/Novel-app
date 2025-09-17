import React from 'react'
import { MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ChatButtonProps {
  className?: string
  showBadge?: boolean
  unreadCount?: number
}

const ChatButton: React.FC<ChatButtonProps> = ({ 
  className = '', 
  showBadge = true, 
  unreadCount = 0 
}) => {
  const navigate = useNavigate()

  // Check if this is being used in mobile menu (has justify-start class)
  const isMobileMenu = className.includes('justify-start')

  const handleClick = () => {
    navigate('/messages')
  }

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center text-sm hover:bg-gray-700 transition-colors ${
        isMobileMenu 
          ? 'w-full px-0 py-2 text-gray-300 hover:text-white' 
          : 'p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110'
      } ${className}`}
      title="Open Messages"
    >
      <MessageCircle className={`${isMobileMenu ? 'h-4 w-4 mr-3' : 'h-6 w-6'}`} />
      {isMobileMenu && <span>Messages</span>}
      
      {showBadge && unreadCount > 0 && (
        <span className={`${
          isMobileMenu 
            ? 'ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold'
            : 'absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse'
        }`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

export default ChatButton
