import React, { useState, useRef, useEffect } from 'react'
import './AudioPlayer.css'

const AudioPlayer = () => {
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

  const audioRef = useRef(null)
  const progressRef = useRef(null)

  // Load available tracks from files folder
  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading tracks from:', 'http://localhost:4004/files-list')
      const response = await fetch('http://localhost:4004/files-list')
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Response data:', data)
        const audioFiles = data.playlist.map(item => item.media).filter(file => 
          file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')
        )
        console.log('🎵 Audio files found:', audioFiles)
        setTracks(audioFiles)
      } else {
        console.error('❌ Response not ok:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
      }
    } catch (error) {
      console.error('❌ Error loading tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubtitle = async (trackName) => {
    try {
      const subtitleName = trackName.replace(/\.(mp3|wav|m4a)$/, '.srt')
      const response = await fetch(`http://localhost:4004/files/${subtitleName}`)
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
    
    if (audioRef.current) {
      audioRef.current.src = `http://localhost:4004/files/${track}`
      await loadSubtitle(track)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
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

  const handleProgressClick = (e) => {
    if (audioRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const width = rect.width
      const newTime = (clickX / width) * duration
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleSubtitleClick = (subtitle) => {
    if (audioRef.current) {
      audioRef.current.currentTime = subtitle.startTime
      setCurrentTime(subtitle.startTime)
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
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setSubtitleText('')
    setCurrentSubtitleIndex(-1)
  }

  return (
    <div className="audio-player">
      <div className="player-main">
        <div className="player-info">
          <div className="track-info">
            <h3>{currentTrack || 'No track selected'}</h3>
            <p>{formatTime(currentTime)} / {formatTime(duration)}</p>
          </div>
          
          <div className="subtitle-display">
            {subtitleText && (
              <div className="current-subtitle">
                {subtitleText}
              </div>
            )}
          </div>
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
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          <div className="control-buttons">
            <button 
              className="btn-play-pause" 
              onClick={handlePlayPause}
              disabled={!currentTrack}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <div className="volume-control">
              <span>🔊</span>
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
              <span>⚡</span>
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
          <h4>📝 Subtitles</h4>
          <div className="subtitle-list">
            {subtitleTracks.length > 0 ? (
              subtitleTracks.map((subtitle, index) => (
                <div
                  key={index}
                  className={`subtitle-item ${currentSubtitleIndex === subtitle.index ? 'active' : ''}`}
                  onClick={() => handleSubtitleClick(subtitle)}
                >
                  <span className="subtitle-time">
                    {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                  </span>
                  <span className="subtitle-text">{subtitle.text}</span>
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
          <h4>📁 Playlist</h4>
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
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}

export default AudioPlayer
