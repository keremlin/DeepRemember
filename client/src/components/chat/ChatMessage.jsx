import React, { useState, useRef, useEffect } from 'react'
import TranslatableText from '../shared/TranslatableText'
import './ChatMessage.css'

const ChatMessage = ({ role, content, timestamp, isLoading = false, isVoice = false, audioBlob = null, audioMimeType = null, playbackSpeed = 1.0 }) => {
  const isUser = role === 'user'
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const contentRef = useRef(null)
  const messageTextRef = useRef(null)

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [audioBlob])

  // Apply playback speed to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Auto-play audio for assistant messages with audio (TTS responses)
  useEffect(() => {
    if (audioUrl && !isUser && role === 'assistant' && audioRef.current) {
      const audio = audioRef.current
      
      // Set playback speed before playing
      audio.playbackRate = playbackSpeed
      
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
  }, [audioUrl, isUser, role, playbackSpeed])

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

  const formatTime = (date) => {
    if (!date) return ''
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Custom text formatter for ChatMessage (handles bullets, markdown bold, etc.)
  const formatContent = (text, renderWord) => {
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
              <TranslatableText
                text={content}
                enabled={!isUser}
                wordClassName="chat-message-word"
                translateButtonClassName="chat-message-translate-button"
                containerClassName="chat-message-text-content"
                contentClassName=""
                showTranslateButton={!isUser && !!content}
                formatText={formatContent}
                textRef={messageTextRef}
                contentRef={contentRef}
              />
              {audioUrl && (
                <div className="chat-message-actions">
                  <button 
                    className="voice-play-button-inline"
                    onClick={handlePlayAudio}
                    title={isPlaying ? 'Pause audio' : 'Play audio'}
                  >
                    <span className="material-symbols-outlined">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                </div>
              )}
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

