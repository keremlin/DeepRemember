import React, { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import VoiceChatInput from './VoiceChatInput'
import Button from '../Button'
import Page from '../Page'
import { useAuth } from '../security/AuthContext'
import { useToast } from '../ToastProvider'
import { getApiUrl } from '../../config/api'
import './Chat.css'

const Chat = ({
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement
}) => {
  const { getAuthHeaders } = useAuth()
  const { showError } = useToast()
  const [chatMode, setChatMode] = useState('text') // 'text' or 'voice'
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m DeepChat, your AI language learning assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (message) => {
    if (!message.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    // Add user message to chat
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    try {
      // Prepare messages for API (only role and content)
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch(getApiUrl('/deepRemember/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ messages: apiMessages })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from AI')
      }

      if (data.success && data.response) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Chat error:', error)
      showError(error.message || 'Failed to send message. Please try again.')
      
      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (value) => {
    setInputValue(value)
  }

  const handleVoiceSend = async (audioBlob) => {
    if (isLoading) return

    setIsLoading(true)

    try {
      // Prepare messages for API (only role and content, exclude voice messages and audio blobs)
      const apiMessages = messages
        .filter(msg => !msg.isVoice && !msg.audioBlob)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      // Create FormData to send audio file
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice_message.webm')
      formData.append('messages', JSON.stringify(apiMessages))

      const response = await fetch(getApiUrl('/deepRemember/chat-voice'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process voice message')
      }

      if (data.success) {
        // Add user message (transcribed text)
        const userMessage = {
          id: Date.now(),
          role: 'user',
          content: data.userText || '[Voice message]',
          timestamp: new Date()
        }

        // Convert base64 audio to blob for assistant message
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
        const assistantAudioBlob = new Blob([audioBytes], { type: data.audioMimeType || 'audio/wav' })

        // Add assistant message with text and audio
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          audioBlob: assistantAudioBlob,
          audioMimeType: data.audioMimeType,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage, assistantMessage])
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Voice chat error:', error)
      showError(error.message || 'Failed to send voice message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleChatMode = () => {
    setChatMode(prev => prev === 'text' ? 'voice' : 'text')
  }

  return (
    <Page
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
    >
      <div className={`chat-container ${chatMode === 'voice' ? 'voice-mode' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-header-title">
              <span className="material-symbols-outlined">conversation</span>
              <h2>DeepChat</h2>
            </div>
            <Button
              onClick={toggleChatMode}
              variant={chatMode === 'voice' ? 'primary' : 'secondary'}
              size="medium"
              iconName={chatMode === 'voice' ? 'keyboard' : 'mic'}
              className="chat-mode-toggle"
            >
              {chatMode === 'voice' ? 'Text Chat' : 'Voice Chat'}
            </Button>
          </div>
        </div>
        
        <div className="chat-messages" ref={chatContainerRef}>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              isVoice={message.isVoice}
              audioBlob={message.audioBlob}
              audioMimeType={message.audioMimeType}
            />
          ))}
          {isLoading && (
            <ChatMessage
              role="assistant"
              content=""
              isLoading={true}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {chatMode === 'text' ? (
          <ChatInput
            value={inputValue}
            onChange={handleInputChange}
            onSend={handleSendMessage}
            disabled={isLoading}
          />
        ) : (
          <VoiceChatInput
            onSend={handleVoiceSend}
            disabled={isLoading}
          />
        )}
      </div>
    </Page>
  )
}

export default Chat

