import React from 'react'
import './ReviewButt.css'

const ReviewButt = ({ onAnswerCard }) => {
  const handleRating = (rating) => {
    if (onAnswerCard) {
      onAnswerCard(rating)
    }
  }

  return (
    <div className="rating-buttons">
      <button 
        className="rating-btn rating-1" 
        onClick={() => handleRating(1)}
        title="Again - Press Z"
      >
        Again<span className="shortcut-key">Z</span>
      </button>
      <button 
        className="rating-btn rating-2" 
        onClick={() => handleRating(2)}
        title="Hard - Press X"
      >
        Hard<span className="shortcut-key">X</span>
      </button>
      <button 
        className="rating-btn rating-3" 
        onClick={() => handleRating(3)}
        title="Good - Press C"
      >
        Good<span className="shortcut-key">C</span>
      </button>
      <button 
        className="rating-btn rating-4" 
        onClick={() => handleRating(4)}
        title="Easy - Press V"
      >
        Easy<span className="shortcut-key">V</span>
      </button>
      <button 
        className="rating-btn rating-5" 
        onClick={() => handleRating(5)}
        title="Perfect - Press B"
      >
        Perfect<span className="shortcut-key">B</span>
      </button>
    </div>
  )
}

export default ReviewButt
