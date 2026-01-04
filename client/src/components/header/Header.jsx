import React from 'react'
import UserInfo from '../security/UserInfo'
import TopMenu from './TopMenu'
import './Header.css'

const Header = ({ 
  isCardsView, 
  onUserSetup, 
  onToggleCardsView, 
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList,
  onNavigateToCourses
}) => {
  return (
    <>
      <div className="header">
        <div className="header-left">
          <h1>🎓 DeepRemember Learning System</h1>
          <p>Spaced Repetition System for vocabulary learning</p>
        </div>
        <div className="header-right">
          <UserInfo onUserSetup={onUserSetup} />
        </div>
      </div>
      <TopMenu 
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToManagement={onNavigateToManagement}
        onNavigateToChat={onNavigateToChat}
        onNavigateToWordList={onNavigateToWordList}
        onNavigateToCourses={onNavigateToCourses}
      />
    </>
  )
}

export default Header
