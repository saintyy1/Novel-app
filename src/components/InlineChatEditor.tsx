import React, { useEffect, useState } from 'react'
import { MessageSquare, Plus, Trash2, X } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: string
  content: string
}

interface InlineChatEditorProps {
  onAddChat: (messages: ChatMessage[]) => void
}

const InlineChatEditor: React.FC<InlineChatEditorProps> = ({ onAddChat }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newSender, setNewSender] = useState('')
  const [newContent, setNewContent] = useState('')

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

  const addMessage = () => {
    if (!newSender.trim() || !newContent.trim()) return
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: newSender.trim(),
      content: newContent.trim(),
    }
    
    setMessages([...messages, message])
    setNewContent('')
  }

  const deleteMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id))
  }

  const insertChat = () => {
    if (messages.length === 0) return
    onAddChat(messages)
    setMessages([])
    setNewSender('')
    setNewContent('')
    setIsOpen(false)
  }

  const cancelChat = () => {
    setMessages([])
    setNewSender('')
    setNewContent('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        title="Add chat messages"
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        Add Chat
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add Chat Messages</h3>
          <button
            onClick={cancelChat}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {/* Add Message Form */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              {newSender.trim() ? `Adding messages for: ${newSender}` : 'Add New Message'}
            </h4>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Sender name (e.g., Unknown, Sarah, etc.)"
                value={newSender}
                onChange={(e) => setNewSender(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                disabled={messages.length > 0 && newSender.trim() !== ''}
              />
              
              <textarea
                placeholder="Message content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    addMessage()
                  }
                }}
              />
              
              <button
                onClick={addMessage}
                disabled={!newSender.trim() || !newContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Message
              </button>
            </div>
          </div>

          {/* Messages Preview */}
          {messages.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Messages Preview ({messages.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={message.id} className="flex items-center justify-between bg-gray-600 rounded p-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400">{message.sender}:</div>
                      <div className="text-sm text-white">{message.content}</div>
                    </div>
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={cancelChat}
            className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={insertChat}
            disabled={messages.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Insert Chat ({messages.length} messages)
          </button>
        </div>
      </div>
    </div>
  )
}

export default InlineChatEditor
