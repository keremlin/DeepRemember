import React from 'react'
import UserInfo from '../security/UserInfo'
import './Header.css'

const Header = ({ 
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
        <UserInfo onUserSetup={onUserSetup} />
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
