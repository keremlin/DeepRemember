import React, { useEffect, useState } from 'react'
import ReviewButt from './ReviewButt'
import Samples from './Samples'
import SampleSentenceCircle from './SampleSentenceCircle'
import { useAuth } from '../security/AuthContext'
import { getApiUrl, getApiBaseUrl } from '../../config/api'
import './ReviewSection.css'

const ReviewSection = ({ 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard 
}) => {
  const { getAuthHeaders } = useAuth()
  const [pressedKey, setPressedKey] = useState(null)
  const [isPlayingWord, setIsPlayingWord] = useState(false)
  const [isCreatingWordAudio, setIsCreatingWordAudio] = useState(false)

  // Function to create word audio
  const createWordAudio = async () => {
    if (!currentCard?.word) return null
    
    setIsCreatingWordAudio(true)
    
    try {
      const response = await fetch(getApiUrl('/deepRemember/convert-to-speech'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        mode: 'cors',
        body: JSON.stringify({ 
          text: currentCard.word.trim(), 
          word: currentCard.word.trim() 
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.audioUrl) {
        // Convert relative URL to absolute URL
        const baseUrl = getApiBaseUrl()
        const fullUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
        return fullUrl
      } else {
        console.warn('Word audio generation failed or TTS service unavailable')
        return null
      }
    } catch (error) {
      console.error('Error creating word audio:', error)
      return null
    } finally {
      setIsCreatingWordAudio(false)
    }
  }

  // Function to play word audio
  const playWordAudio = async () => {
    if (!currentCard?.word || isCreatingWordAudio) return
    
    setIsPlayingWord(true)
    
    try {
      const encodedWord = encodeURIComponent(currentCard.word.trim())
      const response = await fetch(getApiUrl(`/deepRemember/get-audio/${currentCard.word.trim()}/${encodedWord}`), {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        mode: 'cors'
      })
      
      const data = await response.json()
      let audioUrl = null
      
      if (data.success && data.exists && data.audioUrl) {
        // Convert relative URL to absolute URL
        const baseUrl = getApiBaseUrl()
        audioUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
      } else {
        // Audio doesn't exist, create it
        audioUrl = await createWordAudio()
      }
      
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlayingWord(false)
        audio.onerror = () => {
          console.warn('Word audio not available')
          setIsPlayingWord(false)
        }
        await audio.play()
      } else {
        console.warn('Word audio not available or TTS service unavailable')
        setIsPlayingWord(false)
      }
    } catch (error) {
      console.error('Error playing word audio:', error)
      setIsPlayingWord(false)
    }
  }

  // Keyboard event handlers
  const handleKeyDown = (event) => {
    // Enter or Space to show answer
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setPressedKey(event.key) // Track pressed key for shining effect
      setTimeout(() => setPressedKey(null), 300) // Clear after 300ms
      if (!showAnswer && currentCard) {
        setShowAnswer(true)
      }
      return
    }
    
    // Rating shortcuts (Z, X, C, V, B) - only work when answer is shown
    if (showAnswer && currentCard) {
      let rating = 0
      switch (event.key.toLowerCase()) {
        case 'z': rating = 1; break
        case 'x': rating = 2; break
        case 'c': rating = 3; break
        case 'v': rating = 4; break
        case 'b': rating = 5; break
      }
      
      if (rating > 0) {
        event.preventDefault()
        setPressedKey(event.key.toLowerCase()) // Track pressed key for shining effect
        setTimeout(() => setPressedKey(null), 300) // Clear after 300ms
        answerCard(rating)
      }
    }
  }

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAnswer, currentCard, setShowAnswer, answerCard])

  return (
    <div className="srs-card review-section">
      <h3>
        <span className="material-symbols-outlined">dictionary</span>
        Review Cards
      </h3>
      <div className="srs-card current-card">
        <div className="card-content">
          <div className="word-display">
            <div className="word-with-audio">
              <strong>{currentCard?.word || 'Loading...'}</strong>
              {currentCard?.word && (
                <SampleSentenceCircle
                  type="play"
                  isPlaying={isPlayingWord}
                  onClick={playWordAudio}
                  title={
                    isCreatingWordAudio 
                      ? 'Creating audio...' 
                      : 'Play word audio'
                  }
                />
              )}
            </div>
            <button 
              className="answer-btn" 
              onClick={() => setShowAnswer(true)}
              disabled={showAnswer}
            >
              ANSWER
              <span className="answer-shortcuts">
                <span className={`shortcut-item ${pressedKey === 'Enter' ? 'shining' : ''}`}>Enter</span>
                <span className={`shortcut-item ${pressedKey === ' ' ? 'shining' : ''}`}>Space</span>
              </span>
            </button>
          </div>
          
          {/* Always show translation section, but disable when not answered */}
          <div className="answer-content">
            <div className={`translation-section ${!showAnswer ? 'disabled' : ''}`}>
              <div className="translation-header">
                <h4>Answer</h4>
              </div>
              <div className="translation-text">
                {showAnswer && currentCard ? (currentCard.translation || '') : 'Click ANSWER to reveal translation'}
              </div>
            </div>
            <Samples 
              showAnswer={showAnswer}
              currentCard={currentCard}
            />
          </div>
        </div>
        
        {/* Always show rating buttons, but disable when not answered */}
        <div className={`rating-buttons-container ${!showAnswer ? 'disabled' : ''}`}>
          <ReviewButt onAnswerCard={showAnswer ? answerCard : null} pressedKey={pressedKey} />
        </div>
      </div>
    </div>
  )
}

export default ReviewSection
