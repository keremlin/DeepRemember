import React from 'react'
import './Header.css'

const Header = ({ 
  currentUserId, 
  isCardsView, 
  onUserSetup, 
  onToggleCardsView, 
  onNavigateToWelcome 
}) => {
  return (
    <div className="header">
      <div className="header-left">
        <h1>🎓 DeepRemember Learning System</h1>
        <p>Spaced Repetition System for vocabulary learning</p>
      </div>
      <div className="header-right">
        <div className="username-display" onClick={onUserSetup}>
          👤 <span>{currentUserId}</span>
        </div>
        <button className="btn-manage-cards" onClick={onToggleCardsView}>
          {isCardsView ? '📊 Back to Dashboard' : '📚 Manage Cards'}
        </button>
        <button className="btn btn-secondary" onClick={onNavigateToWelcome || (() => window.location.href = '/')}>
          🎵 Back to AI-title
        </button>
      </div>
    </div>
  )
}

export default Header
