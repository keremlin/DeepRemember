import React, { useState, useRef, useEffect } from 'react'
import Page from '../../Page'
import ModernRadioButton from '../../ModernRadioButton/ModernRadioButton'
import { useAuth } from '../../security/AuthContext'
import { useToast } from '../../ToastProvider'
import { getApiUrl, getApiBaseUrl } from '../../../config/api'
import DictationCheckModal from './DictationCheckModal'
import './Dictate.css'

const Dictate = ({
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList,
  onNavigateToCourses
}) => {
  const { authenticatedFetch } = useAuth()
  const { showSuccess, showError } = useToast()
  
  const [dictationText, setDictationText] = useState('')
  const [mode, setMode] = useState('word') // 'word' or 'sentence'
  const [wordsPerChunk, setWordsPerChunk] = useState(5)
  const [breakTime, setBreakTime] = useState(3)
  const [speed, setSpeed] = useState(100) // Speech rate in percentage (50-200)
  const [userWriteText, setUserWriteText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [showCheckModal, setShowCheckModal] = useState(false)
  
  const audioRef = useRef(null)
  
  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      // Note: We don't revoke audioUrl here if it's from the server (not a blob URL)
      // Only revoke if it's a blob URL created with URL.createObjectURL
    }
  }, [])
  
  const handleGenerateAudio = async () => {
    if (!dictationText.trim()) {
      showError('Please enter dictation text')
      return
    }
    
    if (mode === 'word' && (!wordsPerChunk || wordsPerChunk < 1)) {
      showError('Words per chunk must be at least 1')
      return
    }
    
    if (!breakTime || breakTime < 0) {
      showError('Break time must be a positive number')
      return
    }
    
    setIsLoading(true)
    setIsPlaying(false)
    
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setAudioUrl(null)
    
    try {
      const response = await authenticatedFetch(getApiUrl('/deepRemember/dictation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          text: dictationText.trim(),
          mode: mode,
          wordsPerChunk: mode === 'word' ? wordsPerChunk : undefined,
          breakTime: breakTime,
          speed: speed
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate audio' }))
        throw new Error(errorData.error || 'Failed to generate audio')
      }
      
      const data = await response.json()
      
      if (data.success && data.audioUrl) {
        const baseUrl = getApiBaseUrl()
        const fullUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
        setAudioUrl(fullUrl)
        showSuccess('Audio generated successfully')
      } else {
        throw new Error('Failed to generate audio')
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      showError(error.message || 'Failed to generate audio')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePlayPause = () => {
    if (!audioUrl || !audioRef.current) {
      showError('Please generate audio first')
      return
    }
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error('Error playing audio:', error)
          showError('Could not play audio')
          setIsPlaying(false)
        })
    }
  }
  
  const handleCheck = () => {
    if (!dictationText.trim()) {
      showError('Please enter dictation text first')
      return
    }
    
    if (!userWriteText.trim()) {
      showError('Please write your dictation first')
      return
    }
    
    setShowCheckModal(true)
  }
  
  const handleClear = () => {
    setUserWriteText('')
    showSuccess('User dictation cleared')
  }
  
  return (
    <Page
      isCardsView={false}
      onUserSetup={onUserSetup}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      onNavigateToCourses={onNavigateToCourses}
    >
      <div className="dictate-container">
        <div className="dictate-header">
          <h3>
            <span className="material-symbols-outlined">edit_document</span>
            Write from Dictation
          </h3>
        </div>
        
        <div className="dictate-content">
          <div className="dictate-section">
            <label className="dictate-label">Dictation Text:</label>
            <textarea
              className={`dictate-textarea ${isPlaying ? 'blurred' : ''}`}
              value={dictationText}
              onChange={(e) => setDictationText(e.target.value)}
              placeholder="Enter the text you want to be dictated..."
              rows={6}
              readOnly={isPlaying}
            />
          </div>
          
          <div className="dictate-section">
            <label className="dictate-label">Mode:</label>
            <ModernRadioButton
              options={[
                { value: 'word', label: 'By Word' },
                { value: 'sentence', label: 'By Sentence' }
              ]}
              value={mode}
              onChange={setMode}
              name="dictation-mode"
            />
          </div>
          
          {mode === 'word' && (
            <div className="dictate-section">
              <label className="dictate-label">Number of Words:</label>
              <input
                type="number"
                className="dictate-input"
                value={wordsPerChunk}
                onChange={(e) => setWordsPerChunk(parseInt(e.target.value) || 5)}
                min="1"
                max="20"
              />
            </div>
          )}
          
          <div className="dictate-section">
            <div className="dictate-sliders-row">
              <div className="dictate-slider-item">
                <label className="dictate-label-small">Speech Speed: {speed}%</label>
                <div className="dictate-slider-container-small">
                  <input
                    type="range"
                    className="dictate-slider-small"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value) || 100)}
                    min="50"
                    max="200"
                    step="5"
                  />
                  <div className="dictate-slider-labels-small">
                    <span>50%</span>
                    <span>100%</span>
                    <span>200%</span>
                  </div>
                </div>
              </div>
              
              <div className="dictate-slider-item">
                <label className="dictate-label-small">Break Time: {breakTime}s</label>
                <div className="dictate-slider-container-small">
                  <input
                    type="range"
                    className="dictate-slider-small"
                    value={breakTime}
                    onChange={(e) => setBreakTime(parseFloat(e.target.value) || 3)}
                    min="1"
                    max="10"
                    step="0.5"
                  />
                  <div className="dictate-slider-labels-small">
                    <span>1s</span>
                    <span>5.5s</span>
                    <span>10s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dictate-section">
            <div className="dictate-audio-buttons-group">
              <button
                className="dictate-generate-button"
                onClick={handleGenerateAudio}
                disabled={isLoading || !dictationText.trim()}
              >
                {isLoading ? 'Generating...' : 'Generate Audio'}
              </button>
              {audioUrl && (
                <button
                  className="dictate-play-button"
                  onClick={handlePlayPause}
                >
                  <span className="material-symbols-outlined">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              )}
            </div>
          </div>
          
          <div className="dictate-section">
            <label className="dictate-label">Your Dictation:</label>
            <textarea
              className="dictate-textarea"
              value={userWriteText}
              onChange={(e) => setUserWriteText(e.target.value)}
              placeholder="Write what you hear here..."
              rows={6}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
          
          <div className="dictate-section">
            <div className="dictate-buttons-group">
              <button
                className="dictate-check-button"
                onClick={handleCheck}
                disabled={!dictationText.trim() || !userWriteText.trim()}
              >
                <span className="material-symbols-outlined">check_circle</span>
                Check
              </button>
              <button
                className="dictate-clear-button"
                onClick={handleClear}
                disabled={!userWriteText.trim()}
              >
                <span className="material-symbols-outlined">clear</span>
                Clear
              </button>
            </div>
          </div>
        </div>
        
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              showError('Error playing audio')
              setIsPlaying(false)
            }}
            style={{ display: 'none' }}
          />
        )}
      </div>
      
      <DictationCheckModal
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        originalText={dictationText.trim()}
        userText={userWriteText.trim()}
      />
    </Page>
  )
}

export default Dictate

