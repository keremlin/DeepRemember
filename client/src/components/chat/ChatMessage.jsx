import React, { useState, useRef, useEffect } from 'react'
import './ChatMessage.css'

const ChatMessage = ({ role, content, timestamp, isLoading = false, isVoice = false, audioBlob = null }) => {
  const isUser = role === 'user'
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)

  useEffect(() => {
    if (audioBlob && isVoice) {
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [audioBlob, isVoice])

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

  const formatContent = (text) => {
    if (!text) return ''
    
    // Split by newlines and process each line
    const lines = text.split('\n')
    return lines.map((line, index) => {
      // Check if line is a bullet point
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} className="chat-message-bullet">
            {line}
          </div>
        )
      }
      // Check if line is bold (markdown style)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        return (
          <div key={index}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2)
                return <strong key={partIndex}>{boldText}</strong>
              }
              return <span key={partIndex}>{part}</span>
            })}
          </div>
        )
      }
      // Regular line
      return line ? <div key={index}>{line}</div> : <br key={index} />
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
          <div className="chat-message-text">
            {formatContent(content)}
          </div>
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

