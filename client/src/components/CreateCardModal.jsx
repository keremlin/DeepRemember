import React, { useState, useRef, useEffect } from 'react'
import CloseButton from './CloseButton'
import { useToast } from './ToastProvider'
import './CreateCardModal.css'

const CreateCardModal = ({ isOpen, onClose, onCreateCard, currentUserId }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  
  // Create card form states
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newContext, setNewContext] = useState('')
  const [similarWords, setSimilarWords] = useState([])
  const [showSimilarWords, setShowSimilarWords] = useState(false)
  const [translationData, setTranslationData] = useState(null)
  const [showTranslationResult, setShowTranslationResult] = useState(false)
  
  // Loading states
  const [isTranslating, setIsTranslating] = useState(false)
  const [isCreatingVoice, setIsCreatingVoice] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  
  // Refs for timeouts
  const searchTimeoutRef = useRef(null)
  const translationTimeoutRef = useRef(null)

  // Get state color for styling
  const getStateColor = (state) => {
    switch (state) {
      case 0: return '#007bff' // Learning
      case 1: return '#28a745' // Review
      case 2: return '#ffc107' // Relearning
      default: return '#6c757d'
    }
  }

  // Get state name
  const getStateName = (state) => {
    switch (state) {
      case 0: return 'Learning'
      case 1: return 'Review'
      case 2: return 'Relearning'
      default: return 'Unknown'
    }
  }

  // Search similar words
  const searchSimilarWords = async (query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (!query || query.length < 2) {
      setShowSimilarWords(false)
      setSimilarWords([])
      return
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:4004/deepRemember/search-similar/${currentUserId}/${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success && data.words && data.words.length > 0) {
          setSimilarWords(data.words)
          setShowSimilarWords(true)
        } else {
          setSimilarWords([])
          setShowSimilarWords(false)
        }
      } catch (error) {
        setSimilarWords([])
        setShowSimilarWords(false)
      }
    }, 300)
  }

  // Handle word blur for translation
  const handleWordBlur = async () => {
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current)
    }
    
    if (!newWord.trim() || newWord.length < 2) return
    
    translationTimeoutRef.current = setTimeout(async () => {
      await translateWord()
    }, 1000)
  }

  // Function to translate word (extracted for reuse)
  const translateWord = async () => {
    if (!newWord.trim() || newWord.length < 2) return
    
    try {
      setIsTranslating(true)
      setShowTranslationResult(true)
      setTranslationData({
        translation: '🔄 Translating...',
        sampleSentence: 'Please wait while we get the translation from AI'
      })
      
      const response = await fetch('http://localhost:4004/deepRemember/translate-word', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ word: newWord })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setTranslationData(data)
      } else {
        setTranslationData({
          translation: '❌ Translation failed',
          sampleSentence: 'Please try again or enter manually'
        })
      }
    } catch (error) {
      console.error('Error getting translation:', error)
      setTranslationData({
        translation: '❌ Translation error',
        sampleSentence: 'Please try again or enter manually'
      })
    } finally {
      setIsTranslating(false)
    }
  }

  // Handle AI button click
  const handleAIClick = () => {
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current)
    }
    translateWord()
  }

  // Use translation data
  const useTranslationData = () => {
    if (translationData) {
      setNewTranslation(translationData.translation)
      setNewContext(translationData.sampleSentence)
      setShowTranslationResult(false)
    }
  }

  // Function to convert context to speech (for automatic conversion)
  const convertContextToSpeech = async (context, word) => {
    if (!context || !word) return
    
    setIsCreatingVoice(true)
    
    try {
      // Split context into sentences
      const sentences = context.split('\n').filter(s => s.trim())
      
      // Convert each sentence to speech
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]
        if (sentence.trim()) {
          try {
            // Check if audio already exists first
            const encodedSentence = encodeURIComponent(sentence.trim())
            const checkResponse = await fetch(`http://localhost:4004/deepRemember/get-audio/${word.trim()}/${encodedSentence}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              mode: 'cors'
            })
            
            const checkData = await checkResponse.json()
            
            if (checkData.success && checkData.exists) {
              continue // Skip if already exists
            }
            
            // Generate new audio if it doesn't exist
            const response = await fetch('http://localhost:4004/deepRemember/convert-to-speech', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              mode: 'cors',
              body: JSON.stringify({ 
                text: sentence.trim(), 
                word: word.trim() 
              })
            })
            
            if (!response.ok) {
              continue
            }
            
            const data = await response.json()
            // Audio generation completed (success or failure handled silently)
          } catch (error) {
            // Individual sentence errors are handled silently
          }
        }
      }
    } catch (error) {
      // Fatal errors are handled silently
    } finally {
      setIsCreatingVoice(false)
    }
  }

  // Create card function
  const createCard = async () => {
    if (!newWord.trim()) {
      showWarning('Please enter a word')
      return
    }
    
    setIsCreatingCard(true)
    
    try {
      // First create the card
      const response = await fetch('http://localhost:4004/deepRemember/create-card', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          userId: currentUserId,
          word: newWord,
          translation: newTranslation,
          context: newContext
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        // If card creation is successful and there's context, convert to speech
        if (newContext && newContext.trim()) {
          showInfo(`🎤 Creating voice files for "${newWord.trim()}"...`)
          try {
            await convertContextToSpeech(newContext.trim(), newWord.trim())
            showSuccess(`🎵 Voice files created successfully for "${newWord.trim()}"!`)
          } catch (ttsError) {
            showWarning('Card created successfully, but voice files could not be generated')
            // Don't fail the card creation if TTS fails
          }
        }
        
        showSuccess('Card created successfully!')
        // Reset form
        setNewWord('')
        setNewTranslation('')
        setNewContext('')
        setShowSimilarWords(false)
        setShowTranslationResult(false)
        setTranslationData(null)
        // Close modal and notify parent
        onClose()
        if (onCreateCard) {
          onCreateCard()
        }
      } else {
        throw new Error(data.error || 'Failed to create card')
      }
    } catch (error) {
      console.error('Error creating card:', error)
      showError(`Failed to create card: ${error.message}`)
    } finally {
      setIsCreatingCard(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    // Reset form when closing
    setNewWord('')
    setNewTranslation('')
    setNewContext('')
    setShowSimilarWords(false)
    setShowTranslationResult(false)
    setTranslationData(null)
    setSimilarWords([])
    // Reset loading states
    setIsTranslating(false)
    setIsCreatingVoice(false)
    setIsCreatingCard(false)
    onClose()
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Create New Card</h3>
          <CloseButton 
            onClick={handleClose} 
            size="medium" 
            variant="default"
          />
        </div>
        <div className="modal-form">
          <div className="input-with-button">
            <input 
              type="text" 
              value={newWord}
              onChange={(e) => {
                setNewWord(e.target.value)
                searchSimilarWords(e.target.value)
              }}
              onBlur={handleWordBlur}
              placeholder="Enter word to learn"
              tabIndex={1}
            />
            <button
              type="button"
              className="ai-button"
              onClick={handleAIClick}
              disabled={!newWord.trim() || newWord.length < 2 || isTranslating}
              title="Get AI translation"
              tabIndex={3}
            >
              <strong>AI</strong>
            </button>
          </div>
          <input 
            type="text" 
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            placeholder="Enter translation"
            tabIndex={2}
          />
          <textarea 
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="Enter context or example sentence"
            tabIndex={4}
          />
          
          {/* Similar Words Section */}
          {showSimilarWords && similarWords.length > 0 && (
            <div className="similar-words-section">
              <h4>🔍 Similar Words Found:</h4>
              <div className="similar-words-table">
                <table>
                  <thead>
                    <tr>
                      <th>Word</th>
                      <th>Translation</th>
                      <th>State</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {similarWords.map((word, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: '500' }}>{word.word}</td>
                        <td style={{ padding: '8px' }}>{word.translation || 'N/A'}</td>
                        <td style={{ padding: '8px' }}>
                          <span 
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '12px',
                              background: getStateColor(word.state),
                              color: 'white'
                            }}
                          >
                            {getStateName(word.state)}
                          </span>
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                          {new Date(word.due).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Translation Result */}
          {showTranslationResult && translationData && (
            <div className="translation-result" onClick={!isTranslating ? useTranslationData : undefined}>
              <h4>🤖 AI Translation:</h4>
              <div>
                <strong>Translation:</strong> <span className="translation-text">{translationData.translation}</span>
              </div>
              <div>
                <strong>Sample Sentences:</strong> 
                <div className="sample-sentences">{translationData.sampleSentence}</div>
              </div>
              {isTranslating ? (
                <div className="translation-hint">
                  🔄 Getting translation from AI...
                </div>
              ) : (
                <div className="translation-hint">
                  💡 Click to use this translation
                </div>
              )}
            </div>
          )}
          
          <div className="modal-buttons">
            <button className="btn-modal btn-modal-secondary" onClick={handleClose} disabled={isCreatingCard} tabIndex={5}>
              Cancel
            </button>
            <button className="btn-modal btn-modal-primary" onClick={createCard} disabled={isCreatingCard} tabIndex={6}>
              {isCreatingCard ? (
                <>
                  {isCreatingVoice ? '🎤 Creating Voice...' : '💾 Creating Card...'}
                </>
              ) : (
                'Create Card'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCardModal
