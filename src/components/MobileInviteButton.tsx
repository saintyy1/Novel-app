import React, { useState } from 'react'
import { Users } from 'lucide-react'
import InviteFriendsModal from './InviteFriendsModal'

interface MobileInviteButtonProps {
  className?: string
}

const MobileInviteButton: React.FC<MobileInviteButtonProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className={`fixed bottom-20 right-6 z-40 lg:hidden ${className}`}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative p-4 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 active:scale-95"
          title="Invite Friends"
        >
          <Users className="h-6 w-6" />
        </button>
      </div>

      <InviteFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default MobileInviteButton
