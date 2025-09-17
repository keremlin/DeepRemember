import React from 'react'
import CloseButton from './CloseButton'
import './HelpDeepRememberModal.css'

const HelpDeepRememberModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="help-modal" onClick={handleOverlayClick}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        <CloseButton 
          onClick={onClose} 
          size="medium" 
          variant="default"
          className="close-help"
        />
        <h2>📚 DeepRemember Learning System Help</h2>
        
        <h3>🎯 Card States</h3>
        <p>Cards in DeepRemember progress through different states based on your learning performance:</p>
        
        <ul>
          <li><strong>Learning (State 0):</strong> New cards that you're just starting to learn. These appear frequently until you can recall them consistently.</li>
          <li><strong>Review (State 1):</strong> Cards you've successfully learned and are now reviewing at spaced intervals.</li>
          <li><strong>Relearning (State 2):</strong> Cards that you previously knew but have forgotten and need to relearn.</li>
        </ul>
        
        <h3>⏰ Timing System</h3>
        <p>The system uses spaced repetition to optimize your learning:</p>
        
        <ul>
          <li><strong>New Cards:</strong> Start in Learning state and appear every 5 minutes until you rate them "Good" or better.</li>
          <li><strong>Learning Cards:</strong> If you rate them "Again" or "Hard", they return to 5-minute intervals.</li>
          <li><strong>Review Cards:</strong> Appear at increasing intervals based on your performance:
            <ul>
              <li><strong>Again:</strong> Back to Learning state (5 minutes)</li>
              <li><strong>Hard:</strong> Back to Learning state (5 minutes)</li>
              <li><strong>Good:</strong> Next review in 1 day</li>
              <li><strong>Easy:</strong> Next review in 2-3 days</li>
              <li><strong>Perfect:</strong> Next review in 4-7 days</li>
            </ul>
          </li>
        </ul>
        
        <h3>📊 Statistics Explained</h3>
        <ul>
          <li><strong>Total Cards:</strong> All cards in your collection</li>
          <li><strong>Due Cards:</strong> Cards ready for review right now</li>
          <li><strong>Learning:</strong> Cards currently in the learning phase</li>
          <li><strong>Review:</strong> Cards in the review phase</li>
        </ul>
        
        <h3>💡 Tips for Success</h3>
        <ul>
          <li>Be honest with your ratings - this helps the system optimize your learning</li>
          <li>Review cards regularly to maintain your progress</li>
          <li>Use the context field to add example sentences</li>
          <li>Focus on understanding rather than memorization</li>
        </ul>
      </div>
    </div>
  )
}

export default HelpDeepRememberModal
