import React from 'react'
import './SampleSentenceCircle.css'

const SampleSentenceCircle = ({ 
  type = 'play', // 'play' or 'number'
  isPlaying = false,
  number = null,
  onClick,
  title,
  pressedKey = null,
  index = null
}) => {
  const isShining = pressedKey && index !== null && pressedKey === (index + 1).toString()
  
  // Debug logging for shining effect
  if (type === 'number' && pressedKey) {
    console.log(`🔍 SampleSentenceCircle ${index + 1}: pressedKey=${pressedKey}, isShining=${isShining}`)
  }
  
  return (
    <button 
      className={`sample-circle ${type} ${isPlaying ? 'playing' : ''} ${isShining ? 'shining' : ''}`}
      onClick={onClick}
      title={title}
    >
      {type === 'play' ? (
        <div className="play-icon-container">
          {isPlaying ? (
            <svg className="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg className="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </div>
      ) : (
        <span className="number-text">{number}</span>
      )}
    </button>
  )
}

export default SampleSentenceCircle
