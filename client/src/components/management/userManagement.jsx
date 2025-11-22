import React, { useState } from 'react'
import Page from '../Page'
import LabelsModal from '../labels/LabelsModal'
import '../security/UserInfo.css'

const UserManagement = ({ 
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat
}) => {
  const [showLabelsModal, setShowLabelsModal] = useState(false)

  const handleLabelsClick = () => {
    setShowLabelsModal(true)
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

      {/* Labels Modal */}
      <LabelsModal
        isOpen={showLabelsModal}
        onClose={() => setShowLabelsModal(false)}
      />
    </Page>
  )
}

export default UserManagement

