import React from 'react'
import './ReviewButt.css'

const ReviewButt = ({ onAnswerCard, pressedKey }) => {
  const isDisabled = !onAnswerCard
  
  const handleRating = (rating) => {
    if (onAnswerCard && !isDisabled) {
      onAnswerCard(rating)
    }
  }

  return (
    <div className="rating-buttons">
      <button 
        className="rating-btn rating-1" 
        onClick={() => handleRating(1)}
        disabled={isDisabled}
        title={isDisabled ? "Answer the card first" : "Again - Press Z"}
      >
        Again<span className={`shortcut-key ${pressedKey === 'z' ? 'shining' : ''}`}>Z</span>
      </button>
      <button 
        className="rating-btn rating-2" 
        onClick={() => handleRating(2)}
        disabled={isDisabled}
        title={isDisabled ? "Answer the card first" : "Hard - Press X"}
      >
        Hard<span className={`shortcut-key ${pressedKey === 'x' ? 'shining' : ''}`}>X</span>
      </button>
      <button 
        className="rating-btn rating-3" 
        onClick={() => handleRating(3)}
        disabled={isDisabled}
        title={isDisabled ? "Answer the card first" : "Good - Press C"}
      >
        Good<span className={`shortcut-key ${pressedKey === 'c' ? 'shining' : ''}`}>C</span>
      </button>
      <button 
        className="rating-btn rating-4" 
        onClick={() => handleRating(4)}
        disabled={isDisabled}
        title={isDisabled ? "Answer the card first" : "Easy - Press V"}
      >
        Easy<span className={`shortcut-key ${pressedKey === 'v' ? 'shining' : ''}`}>V</span>
      </button>
      <button 
        className="rating-btn rating-5" 
        onClick={() => handleRating(5)}
        disabled={isDisabled}
        title={isDisabled ? "Answer the card first" : "Perfect - Press B"}
      >
        Perfect<span className={`shortcut-key ${pressedKey === 'b' ? 'shining' : ''}`}>B</span>
      </button>
    </div>
  )
}

export default ReviewButt
