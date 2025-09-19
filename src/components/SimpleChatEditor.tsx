import React, { useState } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: string
  content: string
}


interface SimpleChatEditorProps {
  messages: ChatMessage[]
  onUpdate: (messages: ChatMessage[]) => void
  isPreview?: boolean
  chapterContent?: string // Optional chapter content for context
}

const SimpleChatEditor: React.FC<SimpleChatEditorProps> = ({ 
  messages, 
  onUpdate, 
  isPreview = false,
  chapterContent = ''
}) => {
  const [newSender, setNewSender] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [insertPosition, setInsertPosition] = useState<'beginning' | 'middle' | 'end' | 'custom' | 'text-trigger'>('middle')
  const [customPosition, setCustomPosition] = useState(1)
  const [contextBefore, setContextBefore] = useState('')
  const [contextAfter, setContextAfter] = useState('')
  const [showPlacementOptions, setShowPlacementOptions] = useState(false)
  const [textTrigger, setTextTrigger] = useState('')

  const addMessage = () => {
    if (!newSender.trim() || !newContent.trim()) return
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: newSender.trim(),
      content: newContent.trim(),
    }
    
    onUpdate([...messages, message])
    // Keep sender name, only clear content for next message
    setNewContent('')
  }

  const finishConversation = () => {
    setNewSender('')
    setNewContent('')
  }

  const changeSender = () => {
    if (window.confirm('Are you sure you want to change the sender? This will start a new conversation.')) {
      setNewSender('')
      setNewContent('')
    }
  }

  const deleteMessage = (id: string) => {
    onUpdate(messages.filter(msg => msg.id !== id))
  }

  // Analyze chapter content to show paragraph previews
  const getChapterParagraphs = () => {
    if (!chapterContent) return []
    
    const paragraphs = chapterContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => p.trim())
    
    return paragraphs
  }

  const getInsertPositionDescription = () => {
    const paragraphs = getChapterParagraphs()
    const totalParagraphs = paragraphs.length
    
    switch (insertPosition) {
      case 'beginning':
        return `Will be inserted at the very beginning of the chapter (before paragraph 1)`
      case 'end':
        return `Will be inserted at the end of the chapter (after paragraph ${totalParagraphs})`
      case 'middle':
        const middlePos = Math.ceil(totalParagraphs / 2)
        return `Will be inserted in the middle of the chapter (after paragraph ${middlePos})`
      case 'custom':
        return `Will be inserted after paragraph ${customPosition}`
      case 'text-trigger':
        return `Will be inserted where the text "${textTrigger}" appears in the chapter`
      default:
        return ''
    }
  }

  // Find text triggers in chapter content
  const findTextTriggers = () => {
    if (!chapterContent) return []
    
    const triggers: { text: string; position: number; context: string }[] = []
    const lines = chapterContent.split('\n')
    
    lines.forEach((line, lineIndex) => {
      // Look for patterns that might indicate where conversations should appear
      const conversationIndicators = [
        'texted', 'messaged', 'called', 'phoned', 'contacted',
        'received a message', 'got a text', 'checked her phone',
        'opened her phone', 'looked at her phone', 'saw a message'
      ]
      
      conversationIndicators.forEach(indicator => {
        if (line.toLowerCase().includes(indicator.toLowerCase())) {
          const startIndex = line.toLowerCase().indexOf(indicator.toLowerCase())
          const beforeText = line.substring(0, startIndex).trim()
          const afterText = line.substring(startIndex + indicator.length).trim()
          const context = `${beforeText} ${indicator} ${afterText}`.trim()
          
          triggers.push({
            text: context,
            position: lineIndex,
            context: context
          })
        }
      })
    })
    
    return triggers
  }


  // Group consecutive messages from the same sender
  const groupMessages = (messages: ChatMessage[]) => {
    if (messages.length === 0) return []
    
    const groups: { sender: string; messages: ChatMessage[] }[] = []
    let currentGroup: { sender: string; messages: ChatMessage[] } | null = null
    
    messages.forEach(message => {
      if (!currentGroup || currentGroup.sender !== message.sender) {
        currentGroup = { sender: message.sender, messages: [message] }
        groups.push(currentGroup)
      } else {
        currentGroup.messages.push(message)
      }
    })
    
    return groups
  }

  if (isPreview) {
    const messageGroups = groupMessages(messages)
    
    return (
      <div className="space-y-4">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="text-sm font-medium text-gray-300 mb-2">
              {group.sender}:
            </div>
            <div className="space-y-2 ml-4">
              {group.messages.map(message => (
                <div key={message.id} className="bg-gray-200 border border-gray-300 rounded-lg p-3 text-gray-800">
                  {message.content}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Chat Messages
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          {isEditing ? 'Done Editing' : 'Edit Messages'}
        </button>
      </div>

      {/* Add New Message */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          {newSender.trim() ? (
            <span>
              Adding messages for: <span className="text-purple-300 font-semibold">{newSender}</span>
              {messages.filter(msg => msg.sender === newSender.trim()).length > 0 && (
                <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                  {messages.filter(msg => msg.sender === newSender.trim()).length} message{messages.filter(msg => msg.sender === newSender.trim()).length > 1 ? 's' : ''} added
                </span>
              )}
            </span>
          ) : (
            'Add New Message'
          )}
        </h4>
        
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Sender name (e.g., Unknown, Sarah, etc.)"
            value={newSender}
            onChange={(e) => setNewSender(e.target.value)}
            className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
            disabled={messages.length > 0 && newSender.trim() !== ''}
          />
          {messages.length > 0 && newSender.trim() !== '' && (
            <div className="text-xs text-gray-400 bg-gray-600 p-2 rounded flex items-center justify-between">
              <span>💡 Sender name is locked. Add more messages or finish this conversation to start a new one.</span>
              <button
                onClick={changeSender}
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                Change Sender
              </button>
            </div>
          )}
          <textarea
            placeholder="Message content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                addMessage()
              }
            }}
          />
          <div className="flex space-x-2">
            <button
              onClick={addMessage}
              disabled={!newSender.trim() || !newContent.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Message
            </button>
            {newSender.trim() && (
              <button
                onClick={finishConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Finish Conversation
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400">
            💡 Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to quickly add a message
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages added yet</p>
            <p className="text-sm">Add your first message above</p>
          </div>
        ) : (
          (() => {
            const messageGroups = groupMessages(messages)
            let messageIndex = 0
            
            return messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">
                    {group.sender} ({group.messages.length} message{group.messages.length > 1 ? 's' : ''})
                  </span>
                </div>
                
                <div className="space-y-2 ml-4">
                  {group.messages.map(message => {
                    messageIndex++
                    return (
                      <div key={message.id} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            Message {messageIndex}
                          </span>
                          {isEditing && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-200 border border-gray-300 rounded-lg p-3 text-gray-800">
                          {message.content}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          })()
        )}
      </div>

      {/* Placement Options */}
      {messages.length > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-300">Message Placement in Chapter</h4>
            <button
              onClick={() => setShowPlacementOptions(!showPlacementOptions)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showPlacementOptions ? 'Hide Options' : 'Show Options'}
            </button>
          </div>

          {showPlacementOptions && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Insert Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInsertPosition('beginning')}
                    className={`px-3 py-2 rounded text-xs ${
                      insertPosition === 'beginning' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    📖 Beginning
                  </button>
                  <button
                    onClick={() => setInsertPosition('middle')}
                    className={`px-3 py-2 rounded text-xs ${
                      insertPosition === 'middle' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    📄 Middle
                  </button>
                  <button
                    onClick={() => setInsertPosition('end')}
                    className={`px-3 py-2 rounded text-xs ${
                      insertPosition === 'end' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    📚 End
                  </button>
                  <button
                    onClick={() => setInsertPosition('custom')}
                    className={`px-3 py-2 rounded text-xs ${
                      insertPosition === 'custom' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🎯 Custom
                  </button>
                  <button
                    onClick={() => setInsertPosition('text-trigger')}
                    className={`px-3 py-2 rounded text-xs ${
                      insertPosition === 'text-trigger' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    💬 Text Trigger
                  </button>
                </div>
              </div>

              {insertPosition === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Paragraph Number</label>
                  <input
                    type="number"
                    min="1"
                    max={getChapterParagraphs().length || 1}
                    value={customPosition}
                    onChange={(e) => setCustomPosition(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                  />
                </div>
              )}

              {insertPosition === 'text-trigger' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Text Trigger</label>
                    <input
                      type="text"
                      placeholder="e.g., 'texted Dr Sharon' or 'checked her phone'"
                      value={textTrigger}
                      onChange={(e) => setTextTrigger(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      💡 Type the exact text from your chapter where the conversation should appear
                    </div>
                  </div>

                  {chapterContent && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Suggested Triggers</label>
                      <div className="bg-gray-600 rounded p-3 max-h-32 overflow-y-auto">
                        <div className="text-xs text-gray-300 space-y-1">
                          {findTextTriggers().length > 0 ? (
                            findTextTriggers().map((trigger, index) => (
                              <button
                                key={index}
                                onClick={() => setTextTrigger(trigger.text)}
                                className="block w-full text-left p-2 hover:bg-gray-500 rounded text-xs text-gray-300"
                              >
                                <span className="text-gray-500">Line {trigger.position + 1}:</span> {trigger.context}
                              </button>
                            ))
                          ) : (
                            <div className="text-gray-500 text-center">
                              No conversation triggers found. Try adding text like "texted", "messaged", "called", etc.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-400 bg-gray-600 p-2 rounded">
                💡 {getInsertPositionDescription()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Context Before (optional)</label>
                  <textarea
                    placeholder="Text that appears before the conversation..."
                    value={contextBefore}
                    onChange={(e) => setContextBefore(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Context After (optional)</label>
                  <textarea
                    placeholder="Text that appears after the conversation..."
                    value={contextAfter}
                    onChange={(e) => setContextAfter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm"
                    rows={2}
                  />
                </div>
              </div>

              {chapterContent && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Chapter Preview</label>
                  <div className="bg-gray-600 rounded p-3 max-h-32 overflow-y-auto">
                    <div className="text-xs text-gray-300 space-y-1">
                      {getChapterParagraphs().slice(0, 3).map((paragraph, index) => (
                        <div key={index} className="flex">
                          <span className="text-gray-500 mr-2 w-6">{index + 1}.</span>
                          <span className="text-gray-300">{paragraph.substring(0, 100)}...</span>
                        </div>
                      ))}
                      {getChapterParagraphs().length > 3 && (
                        <div className="text-gray-500 text-center">... and {getChapterParagraphs().length - 3} more paragraphs</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SimpleChatEditor
