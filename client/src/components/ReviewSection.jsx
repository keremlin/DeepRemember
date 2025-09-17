import React, { useEffect } from 'react'
import './ReviewSection.css'

const ReviewSection = ({ 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard 
}) => {
  const formatContext = (context) => {
    if (!context) return ''
    return context.split('\n').map((line, index) => (
      <div key={index} className="context-line">
        {line.trim()}
      </div>
    ))
  }

  // Keyboard event handlers
  const handleKeyDown = (event) => {
    // Enter or Space to show answer
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!showAnswer && currentCard) {
        setShowAnswer(true)
      }
      return
    }
    
    // Rating shortcuts (Z, X, C, V, B)
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
                <span className="shortcut-item">Enter</span>
                <span className="shortcut-item">Space</span>
              </span>
            </button>
          </div>
          
          {showAnswer && currentCard && (
            <div className="answer-content">
              <div className="translation-section">
                <h4>Answer</h4>
                <div className="translation-text">{currentCard.translation || ''}</div>
              </div>
              <div className="context-section">
                <h4>Samples</h4>
                <div className="context-text context-display">
                  {formatContext(currentCard.context)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showAnswer && (
          <div className="rating-buttons">
            <button className="rating-btn rating-1" onClick={() => answerCard(1)}>
              Again<span className="shortcut-key">Z</span>
            </button>
            <button className="rating-btn rating-2" onClick={() => answerCard(2)}>
              Hard<span className="shortcut-key">X</span>
            </button>
            <button className="rating-btn rating-3" onClick={() => answerCard(3)}>
              Good<span className="shortcut-key">C</span>
            </button>
            <button className="rating-btn rating-4" onClick={() => answerCard(4)}>
              Easy<span className="shortcut-key">V</span>
            </button>
            <button className="rating-btn rating-5" onClick={() => answerCard(5)}>
              Perfect<span className="shortcut-key">B</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewSection
