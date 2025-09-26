import React, { useState } from 'react'
import { Users, Mail, ArrowRight } from 'lucide-react'
import InviteFriendsModal from './InviteFriendsModal'

const InviteFriendsSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <section className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Who's missing out?</h2>
            <p className="text-purple-100 text-lg">Invite them to NovlNest</p>
          </div>


          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-8 py-4 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Mail className="h-5 w-5 mr-2" />
              Send Invitation
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      <InviteFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default InviteFriendsSection
