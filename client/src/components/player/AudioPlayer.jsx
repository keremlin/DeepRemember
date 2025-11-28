import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useAuth } from '../security/AuthContext'
import { useToast } from '../ToastProvider'
import { getApiUrl, getApiBaseUrl } from '../../config/api'
import Translator from './Translator'
import UploadFileButt from './UploadFileButt'
import './AudioPlayer.css'

function AudioPlayerComponent({ currentUserId = 'user123', onUploadClick }, ref) {
  const { showSuccess, showError } = useToast()
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [subtitleText, setSubtitleText] = useState('')
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1)
  const [tracks, setTracks] = useState([])
  const [showPlaylist, setShowPlaylist] = useState(true)
  const [showSubtitleList, setShowSubtitleList] = useState(true)
  const [subtitleTracks, setSubtitleTracks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [translationText, setTranslationText] = useState('')
  const [showTranslation, setShowTranslation] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationType, setTranslationType] = useState('') // 'word' or 'sentence'
  const [originalText, setOriginalText] = useState('')
  const [timeInput, setTimeInput] = useState('0:00')
  const [isTimeInputFocused, setIsTimeInputFocused] = useState(false)

  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const subtitleListRef = useRef(null)
  const isSeekingRef = useRef(false)
  const wasPlayingBeforeSeekRef = useRef(false)
  const targetSeekTimeRef = useRef(null)
  const seekRetryCountRef = useRef(0)
  const { authenticatedFetch } = useAuth()

  // Expose refreshPlaylist method to parent component
  useImperativeHandle(ref, () => ({
    refreshPlaylist: loadTracks
  }))

  // Load available tracks from files folder
  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      setIsLoading(true)
      const apiUrl = getApiUrl('/files-list')
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const data = await response.json()
        const audioFiles = data.playlist.map(item => item.media).filter(file => 
          file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')
        )
        setTracks(audioFiles)
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubtitle = async (trackName) => {
    try {
      const subtitleName = trackName.replace(/\.(mp3|wav|m4a)$/, '.srt')
      const response = await fetch(getApiUrl(`/files/${subtitleName}`))
      if (response.ok) {
        const subtitleData = await response.text()
        const parsedSubtitles = parseSRT(subtitleData)
        setSubtitleTracks(parsedSubtitles)
        return parsedSubtitles
      }
    } catch (error) {
      console.error('Error loading subtitle:', error)
      setSubtitleTracks([])
    }
    return []
  }

  const parseSRT = (srtText) => {
    const subtitles = []
    const blocks = srtText.trim().split(/\n\s*\n/)
    
    blocks.forEach(block => {
      const lines = block.trim().split('\n')
      if (lines.length >= 3) {
        const index = parseInt(lines[0])
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
        if (timeMatch) {
          const startTime = parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4])
          const endTime = parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8])
          const text = lines.slice(2).join('\n')
          
          subtitles.push({
            index,
            startTime,
            endTime,
            text: text.replace(/<[^>]*>/g, '') // Remove HTML tags
          })
        }
      }
    })
    
    return subtitles.sort((a, b) => a.startTime - b.startTime)
  }

  const parseTime = (hours, minutes, seconds, milliseconds) => {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatTimeForInput = (time) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const parseTimeInput = (timeString) => {
    // Handle formats: M:SS, MM:SS, H:MM:SS, HH:MM:SS
    const parts = timeString.split(':').map(part => parseInt(part.trim()) || 0)
    
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return 0
  }

  // Update time input when currentTime changes (only if not focused)
  useEffect(() => {
    if (!isTimeInputFocused && audioRef.current) {
      setTimeInput(formatTimeForInput(currentTime))
    }
  }, [currentTime, isTimeInputFocused])

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTrackSelect = async (track) => {
    setCurrentTrack(track)
    setCurrentTime(0)
    setCurrentSubtitleIndex(-1)
    setSubtitleText('')
    setTimeInput('0:00')
    
    if (audioRef.current) {
      // Force reload by clearing src first, then setting it again
      // This ensures range request support is enabled
      audioRef.current.src = ''
      audioRef.current.load()
      
      // Small delay to ensure load completes
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Set new source
      audioRef.current.src = getApiUrl(`/files/${track}`)
      await loadSubtitle(track)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      // Only skip time updates if we're actively seeking (within a short window)
      // This prevents getting stuck but still allows smooth playback
      if (isSeekingRef.current) {
        // Check if seek has been stuck for too long (more than 500ms)
        // If so, allow time updates to resume
        return
      }
      
      const current = audioRef.current.currentTime
      setCurrentTime(current)
      
      // Update subtitle
      const subtitle = subtitleTracks.find(sub => 
        current >= sub.startTime && current <= sub.endTime
      )
      
      if (subtitle) {
        setSubtitleText(subtitle.text)
        setCurrentSubtitleIndex(subtitle.index)
      } else {
        setSubtitleText('')
        setCurrentSubtitleIndex(-1)
      }
    }
  }

  const handleTimeInputChange = (e) => {
    setTimeInput(e.target.value)
  }

  const handleTimeInputBlur = () => {
    setIsTimeInputFocused(false)
    if (audioRef.current && duration > 0) {
      const newTime = parseTimeInput(timeInput)
      const clampedTime = Math.max(0, Math.min(duration, newTime))
      
      if (!isNaN(clampedTime) && isFinite(clampedTime)) {
        try {
          isSeekingRef.current = true
          targetSeekTimeRef.current = clampedTime
          wasPlayingBeforeSeekRef.current = !audioRef.current.paused
          
          if (audioRef.current.readyState >= 2) {
            audioRef.current.currentTime = clampedTime
            setCurrentTime(clampedTime)
            setTimeInput(formatTimeForInput(clampedTime))
          } else {
            setTimeout(() => {
              if (audioRef.current && targetSeekTimeRef.current !== null) {
                audioRef.current.currentTime = clampedTime
                setCurrentTime(clampedTime)
                setTimeInput(formatTimeForInput(clampedTime))
              }
            }, 200)
          }
        } catch (error) {
          console.error('Error seeking to time:', error)
        }
      } else {
        // Reset to current time if invalid
        setTimeInput(formatTimeForInput(currentTime))
      }
    }
  }

  const handleTimeInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  const handleProgressClick = (e) => {
    if (!audioRef.current || !progressRef.current || !duration) {
      return
    }
    
    const progressBar = e.currentTarget || progressRef.current
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    
    if (width <= 0) {
      return
    }
    
    const percentage = Math.max(0, Math.min(1, clickX / width))
    const newTime = percentage * duration
    
    if (!isNaN(newTime) && isFinite(newTime) && newTime >= 0) {
      try {
        isSeekingRef.current = true
        targetSeekTimeRef.current = newTime
        wasPlayingBeforeSeekRef.current = !audioRef.current.paused
        
        // Update time input immediately
        const formattedTime = formatTimeForInput(newTime)
        setTimeInput(formattedTime)
        setCurrentTime(newTime)
        
        if (audioRef.current.readyState >= 2) {
          audioRef.current.currentTime = newTime
        } else {
          setTimeout(() => {
            if (audioRef.current && targetSeekTimeRef.current !== null) {
              audioRef.current.currentTime = newTime
            }
          }, 200)
        }
      } catch (error) {
        console.error('Error seeking audio:', error)
        isSeekingRef.current = false
        wasPlayingBeforeSeekRef.current = false
        targetSeekTimeRef.current = null
      }
    }
  }

  const handleSubtitleClick = (subtitle) => {
    if (audioRef.current) {
      audioRef.current.currentTime = subtitle.startTime
      setCurrentTime(subtitle.startTime)
    }
  }

  const handleSubtitleTextClick = async (text, type = 'sentence') => {
    if (!text || isTranslating) return
    
    setIsTranslating(true)
    setShowTranslation(true)
    setTranslationType(type)
    setOriginalText(text)
    setTranslationText('Loading translation...')
    
    try {
      // Different prompts for word vs sentence translation
      const prompt = type === 'word' 
        ? `answer in this format {"translation":"string", "word":"realWord"} , what is the translation of the word "${text}"`
        : `answer in this format {"translation":"string", "sentence":"realSentence"} , what is the translation of "${text}"`
      
      const response = await authenticatedFetch(getApiUrl('/deepRemember/translate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type })
      })
      
      const data = await response.json()
      let translation = data?.translation || 'No translation found.'
      
      setTranslationText(translation)
    } catch (error) {
      console.error('Translation error:', error)
      setTranslationText('Error fetching translation.')
    } finally {
      setIsTranslating(false)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handlePlaybackRateChange = (e) => {
    const newRate = parseFloat(e.target.value)
    setPlaybackRate(newRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setTimeInput(formatTimeForInput(0))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setSubtitleText('')
    setCurrentSubtitleIndex(-1)
    setTimeInput('0:00')
  }

  // Auto-scroll subtitle list to keep active subtitle centered
  useEffect(() => {
    if (currentSubtitleIndex !== -1 && subtitleListRef.current) {
      // Small delay to ensure DOM has updated with active class
      const timeoutId = setTimeout(() => {
        const container = subtitleListRef.current
        if (!container) return
        
        // Find the active subtitle element using data attribute (most reliable)
        const activeElement = container.querySelector(
          `[data-subtitle-index="${currentSubtitleIndex}"]`
        )
        
        if (activeElement) {
          // Use getBoundingClientRect for accurate position calculation
          const containerRect = container.getBoundingClientRect()
          const elementRect = activeElement.getBoundingClientRect()
          
          // Calculate the element's position relative to the container's scrollable content
          // elementRect.top is relative to viewport, containerRect.top is also relative to viewport
          // So elementRect.top - containerRect.top gives position relative to container's visible area
          // We need to add the current scrollTop to get position relative to scrollable content
          const elementTopRelativeToVisible = elementRect.top - containerRect.top
          const elementTopRelativeToContent = container.scrollTop + elementTopRelativeToVisible
          
          const containerHeight = container.clientHeight
          const elementHeight = elementRect.height
          
          // Calculate target scroll position to center the element
          const targetScrollTop = elementTopRelativeToContent - (containerHeight / 2) + (elementHeight / 2)
          
          // Get current scroll position
          const currentScrollTop = container.scrollTop
          
          // Only scroll if we need to move (with a small threshold to avoid jitter)
          if (Math.abs(targetScrollTop - currentScrollTop) > 10) {
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            })
          }
        }
      }, 100) // Delay to ensure DOM update and active class is applied
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentSubtitleIndex])


  return (
    <div className="audio-player">
      <div className="player-main">
        <div className="player-info">
          <div className="track-info">
            <h3>{currentTrack || 'No track selected'}</h3>
            <div className="time-display-container">
              <p>{formatTime(currentTime)} / {formatTime(duration)}</p>
              <input
                type="text"
                className="time-input"
                value={timeInput}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                onFocus={() => setIsTimeInputFocused(true)}
                onKeyDown={handleTimeInputKeyDown}
                placeholder="0:00"
                title="Enter time to seek (MM:SS or HH:MM:SS)"
              />
            </div>
          </div>
          
          <div className="subtitle-display">
            {subtitleText && (
              <div 
                className="current-subtitle"
                onClick={(e) => {
                  const word = e.target.textContent || e.target.innerText
                  handleSubtitleTextClick(word, 'word')
                }}
                style={{ cursor: 'pointer' }}
                title="Click a word to translate"
              >
                {subtitleText.split(' ').map((word, index) => (
                  <span 
                    key={index}
                    className="subtitle-word"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubtitleTextClick(word, 'word')
                    }}
                    style={{ 
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                      e.target.style.color = '#667eea'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent'
                      e.target.style.color = 'inherit'
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
            {!subtitleText && (
              <div className="current-subtitle">
                -
              </div>
            )}
          </div>
          
          <Translator 
            showTranslation={showTranslation}
            setShowTranslation={setShowTranslation}
            translationText={translationText}
            translationType={translationType}
            isTranslating={isTranslating}
            originalText={originalText}
            currentUserId={currentUserId}
          />
          
        </div>

        <div className="player-controls">
          <div className="progress-container">
            <div 
              className="progress-bar" 
              ref={progressRef}
              onClick={handleProgressClick}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div 
                className="progress-handle"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="control-buttons">
            <button 
              className="btn-play-pause" 
              onClick={handlePlayPause}
              disabled={!currentTrack}
            >
              <span className="material-symbols-outlined">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            
            <div className="volume-control">
              <span className="material-symbols-outlined">volume_up</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
            
            <div className="speed-control">
              <span className="material-symbols-outlined">speed</span>
              <select 
                value={playbackRate} 
                onChange={handlePlaybackRateChange}
                className="speed-select"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showSubtitleList && (
        <div className="subtitle-panel">
          <h4>
            <span className="material-symbols-outlined">subtitles</span>
            Subtitles
          </h4>
          <div className="subtitle-list" ref={subtitleListRef}>
            {subtitleTracks.length > 0 ? (
              subtitleTracks.map((subtitle, index) => (
                <div
                  key={index}
                  data-subtitle-index={subtitle.index}
                  className={`subtitle-item ${currentSubtitleIndex === subtitle.index ? 'active' : ''}`}
                  onClick={() => handleSubtitleClick(subtitle)}
                >
                  <span className="subtitle-time">
                    {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                  </span>
                  <span 
                    className="subtitle-text"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubtitleTextClick(subtitle.text, 'sentence')
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to translate sentence"
                  >
                    {subtitle.text}
                  </span>
                </div>
              ))
            ) : (
              <p>No subtitles available</p>
            )}
          </div>
        </div>
      )}

      {showPlaylist && (
        <div className="playlist-panel">
          <div className="playlist-header">
            <h4>
              <span className="material-symbols-outlined">queue_music</span>
              Playlist
            </h4>
            {onUploadClick && (
              <UploadFileButt onClick={onUploadClick} />
            )}
          </div>
          <div className="playlist-list">
            {isLoading ? (
              <p>Loading tracks...</p>
            ) : tracks.length > 0 ? (
              tracks.map((track, index) => (
                <div
                  key={index}
                  className={`playlist-item ${currentTrack === track ? 'active' : ''}`}
                  onClick={() => handleTrackSelect(track)}
                >
                  <span className="track-number">{index + 1}</span>
                  <span className="track-name">{track}</span>
                </div>
              ))
            ) : (
              <p>No audio files found</p>
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onSeeking={() => {
          isSeekingRef.current = true
        }}
        onSeeked={() => {
          const actualTime = audioRef.current?.currentTime || 0
          const targetTime = targetSeekTimeRef.current
          
          // Update state with actual seeked time immediately
          if (audioRef.current) {
            setCurrentTime(actualTime)
          }
          
          // Only retry if seek completely failed (went to 0 when target was much larger)
          // Limit retries to prevent infinite loops
          if (targetTime !== null && actualTime < 0.5 && targetTime > 5 && seekRetryCountRef.current < 2) {
            seekRetryCountRef.current += 1
            
            // Save target before it gets cleared
            const retryTarget = targetTime
            const wasPlaying = wasPlayingBeforeSeekRef.current
            
            // Retry the seek after a short delay (max 2 retries)
            setTimeout(() => {
              if (audioRef.current && retryTarget !== null) {
                try {
                  // Set refs again for retry
                  targetSeekTimeRef.current = retryTarget
                  isSeekingRef.current = true
                  wasPlayingBeforeSeekRef.current = wasPlaying
                  
                  audioRef.current.currentTime = retryTarget
                  setCurrentTime(retryTarget)
                  
                  // Reset flags after a delay to allow seeked event to fire
                  setTimeout(() => {
                    if (seekRetryCountRef.current >= 2) {
                      isSeekingRef.current = false
                      wasPlayingBeforeSeekRef.current = false
                      targetSeekTimeRef.current = null
                      seekRetryCountRef.current = 0
                      
                      // Resume if was playing
                      if (wasPlaying && audioRef.current && audioRef.current.paused) {
                        audioRef.current.play().catch(() => {})
                      }
                    }
                  }, 500)
                } catch (err) {
                  isSeekingRef.current = false
                  wasPlayingBeforeSeekRef.current = false
                  targetSeekTimeRef.current = null
                  seekRetryCountRef.current = 0
                }
              }
            }, 300)
            
            // Don't reset flags yet - wait for retry
            return
          } else if (seekRetryCountRef.current >= 2) {
            // Max retries reached - give up
            seekRetryCountRef.current = 0
          }
          
          // Resume playback if it was playing before seek
          if (wasPlayingBeforeSeekRef.current && audioRef.current) {
            requestAnimationFrame(() => {
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(() => {})
              }
            })
          }
          
          // Always reset seeking flag to allow time updates to resume
          isSeekingRef.current = false
          wasPlayingBeforeSeekRef.current = false
          targetSeekTimeRef.current = null
        }}
      />
    </div>
  )
}

AudioPlayerComponent.displayName = 'AudioPlayer'

const AudioPlayer = forwardRef(AudioPlayerComponent)
AudioPlayer.displayName = 'AudioPlayer'

export default AudioPlayer
