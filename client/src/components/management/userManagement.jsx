import React from 'react'
import Page from '../Page'
import '../security/UserInfo.css'

const UserManagement = ({ 
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement
}) => {
  const handleLabelsClick = () => {
    // Handle labels button click
    console.log('Labels button clicked')
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
    >
      <div className="user-management-content">
        <div className="user-info">
          <div 
            className="user-info-item" 
            onClick={handleLabelsClick} 
            title="Labels"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">label</span>
            </div>
            <div className="user-info-label">Labels</div>
          </div>
        </div>
      </div>
    </Page>
  )
}

export default UserManagement

