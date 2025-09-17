import React from 'react'
import { MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface MobileChatButtonProps {
  unreadCount?: number
}

const MobileChatButton: React.FC<MobileChatButtonProps> = ({ unreadCount = 0 }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/messages')
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 lg:hidden">
      <button
        onClick={handleClick}
        className="relative p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 active:scale-95"
        title="Open Messages"
      >
        <MessageCircle className="h-6 w-6" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default MobileChatButton
