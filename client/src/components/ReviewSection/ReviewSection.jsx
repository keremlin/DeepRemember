import React, { useEffect, useState } from 'react'
import ReviewButt from './ReviewButt'
import Samples from './Samples'
import './ReviewSection.css'

const ReviewSection = ({ 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard 
}) => {
  const [pressedKey, setPressedKey] = useState(null)

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
      <h3>🔄 Review Cards</h3>
      <div className="srs-card current-card">
        <div className="card-content">
          <div className="word-display">
            <strong>{currentCard?.word || 'Loading...'}</strong>
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
              <h4>Answer</h4>
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
