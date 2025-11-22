import React, { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import VoiceChatInput from './VoiceChatInput'
import Button from '../Button'
import Page from '../Page'
import './Chat.css'

const Chat = ({
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement
}) => {
  const [chatMode, setChatMode] = useState('text') // 'text' or 'voice'
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your AI language learning assistant. How can I help you today?',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: 2,
      role: 'user',
      content: 'I want to practice German vocabulary. Can you help me?',
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: 3,
      role: 'assistant',
      content: 'Of course! I can help you practice German vocabulary. Would you like to:\n\n1. Review flashcards you\'ve already created\n2. Learn new words from a specific topic\n3. Practice with example sentences\n4. Get explanations of grammar rules\n\nWhat would you like to start with?',
      timestamp: new Date(Date.now() - 180000)
    },
    {
      id: 4,
      role: 'user',
      content: 'I\'d like to learn new words about food and cooking.',
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: 5,
      role: 'assistant',
      content: 'Great choice! Here are some useful German food and cooking vocabulary words:\n\n• **das Brot** (bread)\n• **der Käse** (cheese)\n• **das Gemüse** (vegetables)\n• **kochen** (to cook)\n• **backen** (to bake)\n• **schneiden** (to cut)\n• **der Herd** (stove)\n• **der Ofen** (oven)\n\nWould you like me to create flashcards for these words, or would you prefer to practice with example sentences first?',
      timestamp: new Date(Date.now() - 60000)
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

  const handleSendMessage = (message) => {
    if (!message.trim() || isLoading) return

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response (in real implementation, this would be an API call)
    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'This is a preview response. In the next step, this will be replaced with actual AI responses from the backend API.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleInputChange = (value) => {
    setInputValue(value)
  }

  const handleVoiceSend = (audioBlob) => {
    // Simulate voice message (in real implementation, this would send audio to API)
    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: '',
      audioBlob: audioBlob,
      isVoice: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'This is a preview voice response. In the next step, this will be replaced with actual AI voice responses from the backend API.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
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

