import React, { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import VoiceChatInput from './VoiceChatInput'
import Button from '../Button'
import Page from '../Page'
import GrammarCheckModal from './GrammarCheckModal'
import { useAuth } from '../security/AuthContext'
import { useToast } from '../ToastProvider'
import { useUserConfig } from '../UserConfigContext'
import { getApiUrl } from '../../config/api'
import './Chat.css'

const Chat = ({
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToWordList
}) => {
  const { authenticatedFetch } = useAuth()
  const { showError } = useToast()
  const { getConfigValue } = useUserConfig()

  const createInitialAssistantMessage = () => ({
    id: Date.now(),
    role: 'assistant',
    content: 'Hallo !',
    timestamp: new Date()
  })

  const [chatMode, setChatMode] = useState('text') // 'text' or 'voice'
  const [messages, setMessages] = useState(() => [createInitialAssistantMessage()])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('free-chat')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [modelProvider, setModelProvider] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [sttLanguage, setSttLanguage] = useState('de')
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9) // Playback speed for voice responses (0.5-1.3)
  const [isGrammarCheckModalOpen, setIsGrammarCheckModalOpen] = useState(false)
  const [grammarCheckResult, setGrammarCheckResult] = useState('')
  const [isGrammarCheckLoading, setIsGrammarCheckLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const chatSessionRef = useRef(0)
  const chatInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-focus input when LLM answer is shown (when loading completes and we're in text mode)
  useEffect(() => {
    if (!isLoading && chatMode === 'text' && messages.length > 0) {
      // Check if the last message is from assistant
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        // Small delay to ensure the message is rendered
        setTimeout(() => {
          chatInputRef.current?.focus()
        }, 100)
      }
    }
  }, [isLoading, messages, chatMode])

  // Load templates and models on mount
  useEffect(() => {
    loadTemplates()
    loadModels()
  }, [])

  // Load chat templates from API
  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await authenticatedFetch(getApiUrl('/api/chat-templates'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplates(data.templates || [])
      } else {
        console.error('Failed to load templates:', data.error)
        showError(data.error || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      showError(`Failed to load templates: ${error.message}`)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadModels = async () => {
    setIsLoadingModels(true)
    try {
      const response = await authenticatedFetch(getApiUrl('/api/llm/models'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setModelProvider(data.provider || '')
        const availableModels = data.models || []
        setModels(availableModels)
        
        // Get default model from user config, fallback to hardcoded default
        const preferredModel = getConfigValue('default_llm_for_chat', '')
        const preferredModelExists = availableModels.some(model => model.id === preferredModel)
        
        setSelectedModelId(prev => {
          // If previous selection still exists, keep it
          if (prev && availableModels.some(model => model.id === prev)) {
            return prev
          }
          // Otherwise, prefer model from config (or hardcoded default) if available
          if (preferredModelExists) {
            return preferredModel
          }
          // Fallback to defaultModel from API or first model
          return data.defaultModel || availableModels[0]?.id || ''
        })
      } else {
        throw new Error(data.error || 'Failed to load models')
      }
    } catch (error) {
      console.error('Error loading models:', error)
      showError(`Failed to load AI models: ${error.message}`)
      setModels([])
    } finally {
      setIsLoadingModels(false)
    }
  }

  const sendTemplateContext = async (templateId, initialMessage) => {
    const numericId = parseInt(templateId, 10)
    if (Number.isNaN(numericId)) {
      return
    }

    const template = templates.find(t => t.id === numericId)
    if (!template) {
      return
    }

    const templateJson = {
      thema: template.thema || '',
      persons: template.persons || '',
      scenario: template.scenario || '',
      questions_and_thema: template.questions_and_thema || '',
      words_to_use: template.words_to_use || '',
      words_not_to_use: template.words_not_to_use || '',
      grammar_to_use: template.grammar_to_use || '',
      level: template.level || ''
    }

    await handleSendMessage(JSON.stringify(templateJson, null, 2), {
      baseMessages: initialMessage ? [initialMessage] : undefined,
      skipInputClear: true,
      overrideLoading: true
    })
  }

  const resetChat = async ({ templateIdOverride, reapplyTemplate = true } = {}) => {
    chatSessionRef.current += 1
    const templateId = templateIdOverride ?? selectedTemplateId
    const initialMessage = createInitialAssistantMessage()
    setMessages([initialMessage])
    setInputValue('')
    setIsLoading(false)

    if (reapplyTemplate && templateId && templateId !== 'free-chat') {
      await sendTemplateContext(templateId, initialMessage)
    }
  }

  // Handle template selection
  const handleTemplateChange = async (e) => {
    const templateId = e.target.value
    setSelectedTemplateId(templateId)
    await resetChat({
      templateIdOverride: templateId,
      reapplyTemplate: templateId !== 'free-chat'
    })
  }

  const handleModelChange = async (e) => {
    const newModel = e.target.value
    setSelectedModelId(newModel)
    await resetChat({
      templateIdOverride: selectedTemplateId,
      reapplyTemplate: selectedTemplateId !== 'free-chat'
    })
  }

  const handleRestartChat = async () => {
    await resetChat({
      templateIdOverride: selectedTemplateId,
      reapplyTemplate: selectedTemplateId !== 'free-chat'
    })
  }

  const handleSttLanguageChange = (event) => {
    setSttLanguage(event.target.value)
  }

  const handlePlaybackSpeedChange = (event) => {
    const newSpeed = parseFloat(event.target.value)
    setPlaybackSpeed(newSpeed)
  }

  const handleSendMessage = async (message, options = {}) => {
    const {
      baseMessages,
      skipInputClear = false,
      overrideLoading = false
    } = options

    if (!message.trim() || (isLoading && !overrideLoading)) return

    const sourceMessages = baseMessages || messages
    const sessionId = chatSessionRef.current

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    // Add user message to chat
    const updatedMessages = [...sourceMessages, userMessage]
    setMessages(updatedMessages)
    if (!skipInputClear) {
      setInputValue('')
    }
    setIsLoading(true)

    try {
      // Prepare messages for API (only role and content)
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const payload = { messages: apiMessages }
      if (selectedModelId) {
        payload.model = selectedModelId
      }

      const response = await authenticatedFetch(getApiUrl('/deepRemember/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
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
        if (chatSessionRef.current !== sessionId) {
          return
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

    const sessionId = chatSessionRef.current
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
      if (selectedModelId) {
        formData.append('model', selectedModelId)
      }
    if (sttLanguage) {
      formData.append('sttLanguage', sttLanguage)
    }

      const response = await authenticatedFetch(getApiUrl('/deepRemember/chat-voice'), {
        method: 'POST',
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

        if (chatSessionRef.current !== sessionId) {
          return
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

  const handleGrammarCheck = async () => {
    // Filter out voice messages and audio blobs, keep only text messages
    const textMessages = messages.filter(msg => !msg.isVoice && !msg.audioBlob)

    if (textMessages.length === 0) {
      showError('No messages found to check.')
      return
    }

    // Check if there are any user messages
    const hasUserMessages = textMessages.some(msg => msg.role === 'user')
    if (!hasUserMessages) {
      showError('No user messages found to check.')
      return
    }

    setIsGrammarCheckModalOpen(true)
    setIsGrammarCheckLoading(true)
    setGrammarCheckResult('')

    try {
      // Remove template messages from history
      // Templates are usually JSON objects sent as user messages
      const cleanedMessages = textMessages.filter(msg => {
        // Check if message is a template (JSON format with template fields)
        if (msg.role === 'user') {
          try {
            const parsed = JSON.parse(msg.content)
            // Check if it has template-like structure
            if (parsed && typeof parsed === 'object' && (
              parsed.thema !== undefined ||
              parsed.persons !== undefined ||
              parsed.scenario !== undefined ||
              parsed.questions_and_thema !== undefined ||
              parsed.words_to_use !== undefined ||
              parsed.words_not_to_use !== undefined ||
              parsed.grammar_to_use !== undefined ||
              parsed.level !== undefined
            )) {
              return false // This is a template, remove it
            }
          } catch (e) {
            // Not JSON, keep it
          }
        }
        return true // Keep all other messages
      })

      // Format messages as "Assistant: [content]" or "User: [content]"
      const conversationHistory = cleanedMessages
        .map(msg => {
          const role = msg.role === 'user' ? 'User' : 'Assistant'
          return `${role}: ${msg.content}`
        })
        .join('\n')

      // Create the prompt with full conversation history
      const prompt = `correct the sentences of User in term of grammer and correctness and spell and provide a sample sentence for that one by one this is the chat history : 

Conversation History:

${conversationHistory}`

      // Prepare messages for API
      const apiMessages = [
        {
          role: 'user',
          content: prompt
        }
      ]

      const payload = { messages: apiMessages }
      if (selectedModelId) {
        payload.model = selectedModelId
      }

      const response = await authenticatedFetch(getApiUrl('/deepRemember/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check grammar')
      }

      if (data.success && data.response) {
        setGrammarCheckResult(data.response)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Grammar check error:', error)
      showError(error.message || 'Failed to check grammar. Please try again.')
      setGrammarCheckResult('Error: ' + (error.message || 'Failed to check grammar'))
    } finally {
      setIsGrammarCheckLoading(false)
    }
  }

  return (
    <Page
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToWordList={onNavigateToWordList}
    >
      <div className={`chat-container ${chatMode === 'voice' ? 'voice-mode' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-controls">
            <div className="chat-selector">
              <label htmlFor="template-select" className="chat-select-label">
                Template
              </label>
              <select
                id="template-select"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="chat-select"
                disabled={isLoadingTemplates || isLoading}
              >
                <option value="free-chat">Free Chat (A2)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.thema || 'Untitled'} ({template.level || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="chat-selector">
              <label htmlFor="stt-language-select" className="chat-select-label">
                STT Language
              </label>
              <select
                id="stt-language-select"
                value={sttLanguage}
                onChange={handleSttLanguageChange}
                className="chat-select"
                disabled={isLoading}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>

            {chatMode === 'voice' && (
              <div className="chat-selector">
                <label htmlFor="playback-speed-range" className="chat-select-label">
                  Playback Speed: {playbackSpeed.toFixed(1)}x
                </label>
                <div className="chat-speed-range-container">
                  <input
                    type="range"
                    id="playback-speed-range"
                    min="0.5"
                    max="1.3"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={handlePlaybackSpeedChange}
                    className="chat-speed-range"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="chat-selector">
              <label htmlFor="model-select" className="chat-select-label">
                AI Model {modelProvider ? `(${modelProvider})` : ''}
              </label>
              <select
                id="model-select"
                value={selectedModelId || ''}
                onChange={handleModelChange}
                className="chat-select"
                disabled={isLoadingModels || isLoading || models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.id || model.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <Button
              onClick={handleRestartChat}
              variant="secondary"
              size="small"
              iconName="refresh"
              className="chat-restart-button"
            >
              Restart Chat
            </Button>
            <Button
              onClick={handleGrammarCheck}
              variant="primary"
              size="small"
              iconName="spellcheck"
              className="chat-check-button"
              disabled={isLoading || messages.filter(msg => msg.role === 'user').length === 0}
            >
              Check!
            </Button>
          </div>
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
              playbackSpeed={playbackSpeed}
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
            ref={chatInputRef}
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
      
      <GrammarCheckModal
        isOpen={isGrammarCheckModalOpen}
        onClose={() => setIsGrammarCheckModalOpen(false)}
        content={grammarCheckResult}
        isLoading={isGrammarCheckLoading}
      />
    </Page>
  )
}

export default Chat

