import React, { useState } from 'react'
import { Users } from 'lucide-react'
import InviteFriendsModal from './InviteFriendsModal'

interface InviteFriendsButtonProps {
  variant?: 'primary' | 'secondary' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIcon?: boolean
  showText?: boolean
}

const InviteFriendsButton: React.FC<InviteFriendsButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  showIcon = true,
  showText = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900'
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const variantStyles = {
      primary: 'bg-purple-600 hover:bg-purple-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600',
      icon: 'p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full'
    }
    
    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`
  }

  const getIconSize = () => {
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }
    return iconSizes[size]
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={getButtonStyles()}
        title="Invite friends to NovlNest"
      >
        {showIcon && (
          <Users className={`${getIconSize()} ${showText ? 'mr-2' : ''}`} />
        )}
        {showText && 'Invite Friends'}
      </button>

      <InviteFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default InviteFriendsButton
