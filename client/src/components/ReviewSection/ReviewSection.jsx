import React, { useEffect, useState, useCallback, useRef } from 'react'
import ReviewButt from './ReviewButt'
import Samples from './Samples'
import SampleSentenceCircle from './SampleSentenceCircle'
import CardLabelList from '../labels/CardLabelList'
import { useAuth } from '../security/AuthContext'
import { getApiUrl, getApiBaseUrl } from '../../config/api'
import './ReviewSection.css'

const ReviewSection = ({ 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard,
  onDeleteCard
}) => {
  const { getAuthHeaders } = useAuth()
  const [pressedKey, setPressedKey] = useState(null)
  const [isPlayingWord, setIsPlayingWord] = useState(false)
  const [isCreatingWordAudio, setIsCreatingWordAudio] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [isPlayingTranslation, setIsPlayingTranslation] = useState(false)
  const [isDeletingCard, setIsDeletingCard] = useState(false)
  const hasAutoPlayedRef = useRef(false)
  const hasAutoPlayedAnswerRef = useRef(false)
  const canDeleteCard = Boolean(onDeleteCard && currentCard?.id)

  // Check if card is a word or sentence based on labels
  const getCardType = (card) => {
    if (!card?.labels || !Array.isArray(card.labels)) {
      return 'word' // Default to word if no labels
    }
    const hasSentenceLabel = card.labels.some(label => label.name === 'sentence')
    return hasSentenceLabel ? 'sentence' : 'word'
  }

  // Get only user labels (filter out system labels)
  const getUserLabelsFromCard = (card) => {
    if (!card?.labels || !Array.isArray(card.labels)) {
      return []
    }
    return card.labels.filter(label => label.type === 'user')
  }

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

  const handleDeleteCard = useCallback(async () => {
    if (!currentCard?.id || !onDeleteCard) return
    setIsDeletingCard(true)
    try {
      await onDeleteCard(currentCard.id)
    } finally {
      setIsDeletingCard(false)
    }
  }, [currentCard?.id, onDeleteCard])

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

  // Function to create translation audio
  const createTranslationAudio = async () => {
    if (!currentCard?.translation) return null
    
    try {
      const response = await fetch(getApiUrl('/deepRemember/convert-to-speech'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        mode: 'cors',
        body: JSON.stringify({ 
          text: currentCard.translation.trim(), 
          word: currentCard.word?.trim() || currentCard.translation.trim()
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.audioUrl) {
        const baseUrl = getApiBaseUrl()
        const fullUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
        return fullUrl
      } else {
        console.warn('Translation audio generation failed or TTS service unavailable')
        return null
      }
    } catch (error) {
      console.error('Error creating translation audio:', error)
      return null
    }
  }

  // Function to play translation audio
  const playTranslationAudio = async () => {
    if (!currentCard?.translation || isPlayingTranslation) return
    
    setIsPlayingTranslation(true)
    
    try {
      const encodedTranslation = encodeURIComponent(currentCard.translation.trim())
      const encodedWord = encodeURIComponent(currentCard.word?.trim() || currentCard.translation.trim())
      
      const response = await fetch(getApiUrl(`/deepRemember/get-audio/${encodedWord}/${encodedTranslation}`), {
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
        const baseUrl = getApiBaseUrl()
        audioUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
      } else {
        audioUrl = await createTranslationAudio()
      }
      
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlayingTranslation(false)
        audio.onerror = () => {
          console.warn('Translation audio not available')
          setIsPlayingTranslation(false)
        }
        await audio.play()
        return audio
      } else {
        console.warn('Translation audio not available or TTS service unavailable')
        setIsPlayingTranslation(false)
        return null
      }
    } catch (error) {
      console.error('Error playing translation audio:', error)
      setIsPlayingTranslation(false)
      return null
    }
  }

  // Function to play a single sample sentence audio
  const playSampleSentenceAudio = async (sentence, word) => {
    if (!sentence || !word) return null
    
    try {
      const encodedSentence = encodeURIComponent(sentence.trim())
      const encodedWord = encodeURIComponent(word.trim())
      
      const response = await fetch(getApiUrl(`/deepRemember/get-audio/${encodedWord}/${encodedSentence}`), {
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
        const baseUrl = getApiBaseUrl()
        audioUrl = baseUrl ? `${baseUrl}${data.audioUrl}` : data.audioUrl
      } else {
        // Create audio if it doesn't exist
        try {
          const createResponse = await fetch(getApiUrl('/deepRemember/convert-to-speech'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            mode: 'cors',
            body: JSON.stringify({ 
              text: sentence.trim(), 
              word: word.trim() 
            })
          })
          
          if (createResponse.ok) {
            const createData = await createResponse.json()
            if (createData.success && createData.audioUrl) {
              const baseUrl = getApiBaseUrl()
              audioUrl = baseUrl ? `${baseUrl}${createData.audioUrl}` : createData.audioUrl
            }
          }
        } catch (error) {
          console.error('Error creating sample sentence audio:', error)
        }
      }
      
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        return new Promise((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => {
            console.warn('Sample sentence audio not available')
            resolve() // Resolve anyway to continue sequence
          }
          audio.play().catch(reject)
        })
      }
    } catch (error) {
      console.error('Error playing sample sentence audio:', error)
    }
    return Promise.resolve()
  }

  // Function to play all sample sentences sequentially
  const playAllSampleSentences = useCallback(async () => {
    if (!currentCard?.context || !showAnswer || !currentCard?.word) return
    
    const sentences = currentCard.context.split('\n').filter(s => s.trim())
    if (sentences.length === 0) return
    
    // Wait 2 seconds after translation finishes
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (!sentence) continue
      
      // Play the sentence audio and wait for it to finish
      await playSampleSentenceAudio(sentence, currentCard.word)
      
      // Wait 2 seconds idle time between sentences (except after the last one)
      if (i < sentences.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }, [currentCard?.context, currentCard?.word, showAnswer])

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

  // Auto-play word audio when card changes (if auto-play is enabled)
  useEffect(() => {
    if (autoPlay && currentCard?.word && !showAnswer) {
      // Reset the flag when card changes
      hasAutoPlayedRef.current = false
      hasAutoPlayedAnswerRef.current = false
    }
  }, [currentCard?.word, autoPlay, showAnswer])

  useEffect(() => {
    if (autoPlay && currentCard?.word && !showAnswer && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true
      // Small delay to ensure card is fully loaded
      const timer = setTimeout(() => {
        playWordAudio()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, currentCard?.word, showAnswer])

  // Auto-play translation and samples when answer is shown (if auto-play is enabled)
  useEffect(() => {
    if (autoPlay && showAnswer && currentCard && !hasAutoPlayedAnswerRef.current) {
      hasAutoPlayedAnswerRef.current = true
      const playSequence = async () => {
        // Play translation audio first
        const translationAudio = await playTranslationAudio()
        
        // Wait for translation audio to finish, then play samples
        if (translationAudio) {
          translationAudio.onended = () => {
            setIsPlayingTranslation(false)
            // Start playing sample sentences after translation finishes
            playAllSampleSentences()
          }
        } else {
          // If translation audio failed, still try to play samples after delay
          setTimeout(() => {
            playAllSampleSentences()
          }, 2000)
        }
      }
      
      playSequence()
    }
  }, [showAnswer, autoPlay, currentCard, playAllSampleSentences])

  // Reset flags when showAnswer changes to false
  useEffect(() => {
    if (!showAnswer) {
      hasAutoPlayedAnswerRef.current = false
    }
  }, [showAnswer])

  return (
    <div className="srs-card review-section">
      <h3>
        <span className="material-symbols-outlined">dictionary</span>
        Review Cards
        <label className="auto-play-checkbox">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          <span className="material-symbols-outlined google-icon">volume_up</span>
        </label>
      </h3>
      <div className="srs-card current-card">
        <div className="card-content">
          <div className="word-display">
            <div className="word-with-audio">
              <div className={`word-center-container ${canDeleteCard ? 'has-delete-button' : ''}`.trim()}>
                {canDeleteCard && (
                  <button
                    type="button"
                    className="word-delete-button"
                    onClick={handleDeleteCard}
                    disabled={isDeletingCard}
                    title="Delete this card"
                    aria-label="Delete this card"
                  >
                    <span className="material-symbols-outlined google-icon">delete</span>
                  </button>
                )}
                <strong>{currentCard?.word || 'Loading...'}</strong>
                {currentCard?.word && (
                  <div className="word-audio-button">
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
                  </div>
                )}
              </div>
              {currentCard && (
                <CardLabelList
                  card={currentCard}
                  getCardType={getCardType}
                  getUserLabelsFromCard={getUserLabelsFromCard}
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
