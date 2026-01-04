import React from 'react'
import Page from '../Page'
import '../security/UserInfo.css'

const Courses = ({ 
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList
}) => {
  const handleDiktateClick = () => {
    // Do nothing for now
  }

  return (
    <Page
      isCardsView={false}
      onUserSetup={onUserSetup}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
    >
      <div className="user-management-content">
        <div className="user-info">
          <div 
            className="user-info-item" 
            onClick={handleDiktateClick} 
            title="Diktate"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">edit_document</span>
            </div>
            <div className="user-info-label">Diktate</div>
          </div>
        </div>
      </div>
    </Page>
  )
}

export default Courses

