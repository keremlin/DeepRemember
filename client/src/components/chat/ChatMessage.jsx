import React, { useState, useRef, useEffect } from 'react'
import WordTranslationPopover from './WordTranslationPopover'
import SentenceTranslationPopover from './SentenceTranslationPopover'
import './ChatMessage.css'

const ChatMessage = ({ role, content, timestamp, isLoading = false, isVoice = false, audioBlob = null, audioMimeType = null }) => {
  const isUser = role === 'user'
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [popoverState, setPopoverState] = useState({ word: null, position: null })
  const [sentencePopoverState, setSentencePopoverState] = useState({ text: null, position: null })
  const contentRef = useRef(null)
  const translateButtonRef = useRef(null)
  const messageTextRef = useRef(null)

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [audioBlob])

  // Auto-play audio for assistant messages with audio (TTS responses)
  useEffect(() => {
    if (audioUrl && !isUser && role === 'assistant' && audioRef.current) {
      const audio = audioRef.current
      
      // Wait for audio to be ready before playing
      const handleCanPlay = () => {
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true)
            })
            .catch(error => {
              // Auto-play was prevented (browser policy), user will need to click play
              // Silently fail - this is expected behavior in many browsers
            })
        }
      }

      if (audio.readyState >= 2) {
        // Audio is already loaded enough to play
        handleCanPlay()
      } else {
        // Wait for audio to be ready
        audio.addEventListener('canplay', handleCanPlay, { once: true })
        return () => {
          audio.removeEventListener('canplay', handleCanPlay)
        }
      }
    }
  }, [audioUrl, isUser, role])

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => setIsPlaying(false)
      const handlePause = () => setIsPlaying(false)
      audioRef.current.addEventListener('ended', handleEnded)
      audioRef.current.addEventListener('pause', handlePause)
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded)
          audioRef.current.removeEventListener('pause', handlePause)
        }
      }
    }
  }, [audioUrl])

  // Close popovers on scroll
  useEffect(() => {
    if (!popoverState.word && !sentencePopoverState.text) return

    const handleScroll = () => {
      setPopoverState({ word: null, position: null })
      setSentencePopoverState({ text: null, position: null })
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [popoverState.word, sentencePopoverState.text])

  const formatTime = (date) => {
    if (!date) return ''
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleWordClick = (e, word) => {
    if (isUser) return
    
    e.stopPropagation()
    
    // Close sentence popover if open
    setSentencePopoverState({ text: null, position: null })
    
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"`]/g, '').trim()
    if (!cleanWord) return
    
    // Get the position of the clicked element relative to viewport
    const rect = e.currentTarget.getBoundingClientRect()
    const contentRect = contentRef.current?.getBoundingClientRect()
    
    if (!contentRect) return
    
    // Calculate position relative to the content container (for absolute positioning)
    const popoverHeight = 50 // Approximate popover height
    const popoverMaxWidth = 250 // Max width of popover
    const wordCenterX = rect.left - contentRect.left + rect.width / 2
    let x = wordCenterX
    let y = rect.top - contentRect.top - popoverHeight - 8 // Position above the word with spacing
    
    // Adjust if popover would go off screen horizontally
    const halfPopoverWidth = popoverMaxWidth / 2
    if (x - halfPopoverWidth < 0) {
      x = halfPopoverWidth
    } else if (x + halfPopoverWidth > contentRect.width) {
      x = contentRect.width - halfPopoverWidth
    }
    
    // Adjust if popover would go off screen vertically (show below instead)
    const showBelow = y < 0
    if (showBelow) {
      y = rect.bottom - contentRect.top + 8 // Position below the word with spacing
    }
    
    const position = {
      x: x, // Center of the word - popover will be centered using transform
      y: y,
      showBelow: showBelow
    }
    
    setPopoverState({ word: cleanWord, position })
  }

  const handleClosePopover = () => {
    setPopoverState({ word: null, position: null })
  }

  const handleTranslateClick = (e) => {
    if (isUser || !content) return
    
    e.stopPropagation()
    
    // Close word popover if open
    setPopoverState({ word: null, position: null })
    
    const messageTextRect = messageTextRef.current?.getBoundingClientRect()
    const contentRect = contentRef.current?.getBoundingClientRect()
    
    if (!messageTextRect || !contentRect) return
    
    // Position popover below the message bubble, centered horizontally on the bubble
    // Calculate position relative to contentRef (where popover will be positioned)
    const popoverMaxWidth = 400 // Max width of popover
    const messageCenterX = messageTextRect.left - contentRect.left + messageTextRect.width / 2
    let x = messageCenterX
    // Position below the message bubble - calculate from messageTextRect bottom to contentRect top
    const y = messageTextRect.bottom - contentRect.top + 8 // Position below the message bubble
    
    // Adjust if popover would go off screen horizontally
    const halfPopoverWidth = popoverMaxWidth / 2
    if (x - halfPopoverWidth < 0) {
      x = halfPopoverWidth
    } else if (x + halfPopoverWidth > contentRect.width) {
      x = contentRect.width - halfPopoverWidth
    }
    
    setSentencePopoverState({ 
      text: content, 
      position: { x, y, showBelow: true } // Always show below the message
    })
  }

  const handleCloseSentencePopover = () => {
    setSentencePopoverState({ text: null, position: null })
  }

  const renderWord = (word, wordIndex, lineIndex) => {
    const trimmedWord = word.trim()
    if (!trimmedWord) {
      // Return whitespace as-is
      return <span key={`${lineIndex}-${wordIndex}`}>{word}</span>
    }
    
    if (isUser) {
      return <span key={`${lineIndex}-${wordIndex}`}>{word}</span>
    }
    
    return (
      <span
        key={`${lineIndex}-${wordIndex}`}
        className="chat-message-word"
        onClick={(e) => handleWordClick(e, trimmedWord)}
        title="Click to translate"
      >
        {word}
      </span>
    )
  }

  const formatContent = (text) => {
    if (!text) return ''
    
    // Split by newlines and process each line
    const lines = text.split('\n')
    return lines.map((line, lineIndex) => {
      // Check if line is a bullet point
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        // Split bullet line into words (preserve whitespace)
        const words = line.split(/(\s+)/)
        return (
          <div key={lineIndex} className="chat-message-bullet">
            {words.map((word, wordIndex) => renderWord(word, wordIndex, lineIndex))}
          </div>
        )
      }
      // Check if line is bold (markdown style)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        return (
          <div key={lineIndex}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2)
                // Split bold text into words
                const words = boldText.split(/(\s+)/)
                return (
                  <strong key={partIndex}>
                    {words.map((word, wordIndex) => renderWord(word, wordIndex, `${lineIndex}-${partIndex}`))}
                  </strong>
                )
              }
              // Split regular text into words
              const words = part.split(/(\s+)/)
              return (
                <span key={partIndex}>
                  {words.map((word, wordIndex) => renderWord(word, wordIndex, `${lineIndex}-${partIndex}`))}
                </span>
              )
            })}
          </div>
        )
      }
      // Regular line - split into words
      if (line) {
        const words = line.split(/(\s+)/)
        return (
          <div key={lineIndex}>
            {words.map((word, wordIndex) => renderWord(word, wordIndex, lineIndex))}
          </div>
        )
      }
      return <br key={lineIndex} />
    })
  }

  if (isLoading) {
    return (
      <div className={`chat-message chat-message-assistant`}>
        <div className="chat-message-avatar">
          <span className="material-symbols-outlined">smart_toy</span>
        </div>
        <div className="chat-message-content">
          <div className="chat-message-loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-message-avatar">
        {isUser ? (
          <span className="material-symbols-outlined">person</span>
        ) : (
          <span className="material-symbols-outlined">smart_toy</span>
        )}
      </div>
      <div className="chat-message-content">
        {isVoice && audioUrl ? (
          <div className="chat-message-voice">
            <button 
              className="voice-play-button"
              onClick={handlePlayAudio}
              title={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              <span className="material-symbols-outlined">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div className="voice-message-info">
              <span className="voice-message-label">Voice message</span>
              {audioRef.current && (
                <span className="voice-message-duration">
                  {Math.round(audioRef.current.duration || 0)}s
                </span>
              )}
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onLoadedMetadata={() => {
                // Force re-render to show duration
                if (audioRef.current) {
                  setIsPlaying(prev => prev)
                }
              }}
            />
          </div>
        ) : (
          <>
            <div 
              ref={messageTextRef}
              className="chat-message-text"
            >
              <div 
                ref={contentRef}
                className="chat-message-text-content"
                style={{ position: 'relative' }}
              >
                {formatContent(content)}
                {popoverState.word && popoverState.position && (
                  <WordTranslationPopover
                    word={popoverState.word}
                    position={popoverState.position}
                    onClose={handleClosePopover}
                  />
                )}
                {sentencePopoverState.text && sentencePopoverState.position && (
                  <SentenceTranslationPopover
                    text={sentencePopoverState.text}
                    position={sentencePopoverState.position}
                    onClose={handleCloseSentencePopover}
                  />
                )}
              </div>
              <div className="chat-message-actions">
                {!isUser && content && (
                  <button
                    ref={translateButtonRef}
                    className="chat-message-translate-button"
                    onClick={handleTranslateClick}
                    title="Translate message"
                  >
                    <span className="material-symbols-outlined google-icon">translate</span>
                  </button>
                )}
                {audioUrl && (
                  <button 
                    className="voice-play-button-inline"
                    onClick={handlePlayAudio}
                    title={isPlaying ? 'Pause audio' : 'Play audio'}
                  >
                    <span className="material-symbols-outlined">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setIsPlaying(prev => prev)
                  }
                }}
              />
            )}
          </>
        )}
        {timestamp && (
          <div className="chat-message-timestamp">
            {formatTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage

